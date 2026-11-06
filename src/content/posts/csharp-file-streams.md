---
title: "C# 文件流读取中的字节、编码和结束条件"
description: "用 FileStream 拷贝文件，用 StreamReader 读取文本，并处理短读、编码和资源释放"
date: "2026-11-06"
minutes: 5
topic: desktop
tags: ["C#", ".NET", "文件 I/O"]
order: -2
---

这篇文章整理自笔记《C#IO流》。读取一份导出文件时，先决定要处理的是**原始字节**还是**字符**。如果只是复制文件，可以按字节处理。如果要分析每一行，就要用与文件格式一致的编码解码。

## 拷贝文件时以实际读取量为准

`FileStream` 提供字节流。`Read` 的第三个参数是本次最多读取的字节数，实际返回值可能更小。对正长度缓冲区来说，读到末尾后会返回 0。写入目标流时，应使用本次返回的数量。

```csharp
using System.IO;

public static class FileCopies
{
    public static void CopyToNewFile(string sourcePath, string destinationPath)
    {
        using (var input = File.OpenRead(sourcePath))
        using (var output = new FileStream(
            destinationPath, FileMode.CreateNew, FileAccess.Write))
        {
            var buffer = new byte[8192];
            int count;
            while ((count = input.Read(buffer, 0, buffer.Length)) > 0)
            {
                output.Write(buffer, 0, count);
            }
        }
    }
}
```

`FileMode.CreateNew` 要求目标路径尚不存在，适合在测试目录观察读写结果。日常只需复制整个流时，可以直接调用 `input.CopyTo(output)`。如果目标文件还会被其他程序监视并读取，可以先写到临时文件，写完关闭后再按约定交付文件。

## 逐行读取文本时显式选择编码

对约定为 UTF-8 的日志，`StreamReader` 能解码中文，也会处理跨缓冲区的字符。下面的例子启用了 BOM 检测，同时以 UTF-8 作为无 BOM 文件的默认编码。每次只保留一行，适合扫描较大的本地文本。

```csharp
using System.IO;
using System.Text;

public static class LogCounts
{
    public static int CountNonEmptyLines(string path)
    {
        int count = 0;
        using (var reader = new StreamReader(
            path, Encoding.UTF8, detectEncodingFromByteOrderMarks: true))
        {
            string line;
            while ((line = reader.ReadLine()) != null)
            {
                if (!string.IsNullOrWhiteSpace(line))
                    count++;
            }
        }
        return count;
    }
}
```

空行返回空字符串，流末尾才返回 `null`。如果文件来自旧系统且约定使用其他编码，应根据接口约定选用对应的编码。对含中文的文本逐字节转成 `char`，会把多字节字符拆开。

## 定位和释放流

对支持定位的流，可以用 `Seek` 或 `Position` 跳到指定**字节**位置。复用抽象 `Stream` 时先检查 `CanSeek`，因为网络流等实现可能不支持定位。如果要对已缓冲的文本重新读取，优先重新打开读取器，避免底层流位置与读取器缓冲状态不一致。

`using` 会在退出代码块时释放流或读取器，即使中途抛出异常。用现有流构造读取器或写入器时，还应确定底层流由谁关闭。需要在释放外层对象后继续使用底层流时，可以选择支持 `leaveOpen` 的构造方法。

参考 [Microsoft Learn 的文件和流 I/O 指南](https://learn.microsoft.com/zh-cn/dotnet/standard/io/) 和 [Stream.Read 文档](https://learn.microsoft.com/zh-cn/dotnet/api/system.io.stream.read)。
