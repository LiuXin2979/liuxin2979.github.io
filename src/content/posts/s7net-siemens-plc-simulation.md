---
title: "S7.Net 与西门子 PLC 通讯：从本机模拟读取开始"
description: "用 S7.Net Plus 连接回环地址上的模拟数据块，练习单点读取、批量读取和字节解码"
date: "2026-11-06"
minutes: 7
topic: control
tags: ["C#", "S7.Net", "PLC", "离线模拟"]
order: -5
---

这篇文章整理自《S7.Net与西门子PLC通讯》。原笔记从仿真、连接讲到单点读取和数据块读取。这里用 Snap7 在本机提供一个虚构数据块，再用 S7.Net Plus 编写只读客户端。通信地址固定为回环地址 `127.0.0.1:11020`，数据全部由模拟脚本生成。

## 先约定虚构点位

模拟数据块编号为 **DB901**，长度为 16 字节。下面四个值是固定的测试数据，便于核对读到的类型和符号。

| 绝对地址 | 类型 | 含义 | 期望值 |
| --- | --- | --- | --- |
| `DB901.DBX0.3` | BOOL | 模拟就绪位 | `true` |
| `DB901.DBW4` | INT | 模拟有符号样本值 | `-12` |
| `DB901.DBD8` | REAL | 模拟浮点读数 | `25.5` |
| `DB901.DBD12` | DINT | 模拟有符号偏移量 | `-1200` |

`DBX0.3` 表示第 0 字节的第 3 位。`DBW4` 从字节偏移 4 开始占 2 字节。`DBD8` 从字节偏移 8 开始占 4 字节。地址标记给出了读取宽度，实际类型还要看点位表。例如，`REAL` 与 `DINT` 都占 4 字节，解码方式不同。

## 1. 启动本机模拟服务

在隔离的 Python 环境中安装 `python-snap7==2.0.2`，将下面的代码保存为 `sim_plc.py` 并运行。脚本只监听回环地址，按回车结束模拟服务。

```python
import ctypes
import struct

from snap7.server import Server
from snap7.type import SrvArea

db = (ctypes.c_uint8 * 16)()
db[0] = 1 << 3
struct.pack_into(">h", db, 4, -12)
struct.pack_into(">f", db, 8, 25.5)
struct.pack_into(">i", db, 12, -1200)

server = Server(log=False)
try:
    server.register_area(SrvArea.DB, 901, db)
    server.start_to("127.0.0.1", 11020)
    input("模拟服务已启动，按回车退出。\n")
finally:
    server.stop()
    server.destroy()
```

`struct` 格式串中的 `>` 表示大端字节序，`h`、`f`、`i` 分别生成 16 位整数、32 位浮点数和 32 位整数。把偏移量集中写在脚本里，可以直接对照点位表检查。

## 2. 在 C# 中连接并读取

创建 C# 控制台项目，在项目目录执行 `dotnet add package S7netplus --version 0.20.0`，再用下面的程序替换 `Program.cs`。示例中的 `CpuType`、机架号和槽号用于这次模拟连接。

```csharp
using System;
using System.Globalization;
using System.Linq;
using S7.Net;
using S7.Net.Types;

internal static class Program
{
    private static int Main()
    {
        const int dbNumber = 901;
        using (var plc = new Plc(CpuType.S71200, "127.0.0.1", 11020, 0, 0))
        {
            plc.ReadTimeout = 1500;
            string stage = "连接模拟服务";

            try
            {
                plc.Open();

                stage = "读取单点";
                if (!(plc.Read("DB901.DBX0.3") is bool ready) ||
                    !(plc.Read(DataType.DataBlock, dbNumber, 4, VarType.Int, 1)
                        is short sample))
                {
                    Console.Error.WriteLine("单点返回类型与模拟点位表不一致");
                    return 1;
                }
                Console.WriteLine($"单点  Ready={ready}, Sample={sample}");

                stage = "读取连续字节";
                byte[] data = plc.ReadBytes(DataType.DataBlock, dbNumber, 0, 16);
                bool batchReady = (data[0] & (1 << 3)) != 0;
                short batchSample = Int.FromByteArray(data.Skip(4).Take(2).ToArray());
                float reading = Real.FromByteArray(data.Skip(8).Take(4).ToArray());
                int offset = DInt.FromByteArray(data.Skip(12).Take(4).ToArray());

                Console.WriteLine(string.Format(
                    CultureInfo.InvariantCulture,
                    "批量  Ready={0}, Sample={1}, Reading={2}, Offset={3}",
                    batchReady, batchSample, reading, offset));

                return 0;
            }
            catch (PlcException ex)
            {
                Console.Error.WriteLine($"{stage}失败（{ex.ErrorCode}） {ex.Message}");
                return 1;
            }
        }
    }
}
```

运行 `dotnet run`，应看到以下两行。

```text
单点  Ready=True, Sample=-12
批量  Ready=True, Sample=-12, Reading=25.5, Offset=-1200
```

单点读取时，字符串地址适合表达位地址。读取有符号整数时可以显式传入 `VarType.Int`，把点位的类型也交代清楚。批量读取时，`ReadBytes` 的第三个参数是起始字节偏移，第四个参数是字节数。最后一个字段从偏移 12 开始占 4 字节，因此从偏移 0 起需要读 16 字节。随后由 `Int`、`Real`、`DInt` 分别解码。

## 3. 怎样选择读取方式

- **`Read`** 适合确认一个点位的地址、类型和预期值。先用它核对新点位，再把需要连续采集的字段合并。
- **`ReadBytes`** 适合连续区域。点位变动时，把数据块长度、字段偏移和类型一起核对。实际运行中，连续读取能减少请求次数。数据是否来自同一业务轮次，则由设备端的数据更新协议决定。
- **`ReadClass`** 适合固定布局的映射。属性的类型和排列要与数据块布局匹配，属性名相同并不能代替偏移核对。
- **`ReadMultipleVars`** 适合分散点位。用 `DataItem` 声明区域、DB 号、偏移和变量类型，读取后从各项的 `Value` 取结果。一次请求能携带多少点位，取决于连接协商的报文大小和字段长度。

如果模拟程序报错，先看失败阶段。连接阶段检查模拟服务和端口。连接成功但读取失败时，检查 DB 编号、起始字节和长度。若连接的是经过授权的独立试验设备，绝对地址访问还取决于 CPU 的访问权限与数据块布局，应以该型号文档和试验配置为准。

参考 [S7.Net Plus 官方文档](https://github.com/S7NetPlus/s7netplus/wiki)、[python-snap7 2.0.2](https://pypi.org/project/python-snap7/2.0.2/) 和 [西门子 S7-1200/S7-1500 编程指南](https://support.industry.siemens.com/cs/attachments/90885040/81318674_Programming_guideline_DOC_v16_en.pdf)。
