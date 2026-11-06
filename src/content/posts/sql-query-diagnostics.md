---
title: "从逻辑读取量定位 SQL Server 查询瓶颈"
description: "用虚构追溯表记录读页和耗时，再用实际执行计划检查扫描、排序与索引"
date: "2026-11-06"
minutes: 4
topic: database
tags: ["SQL Server", "执行计划", "追溯"]
order: 2
---

## 先确定可复现的查询

假设一张 `dbo.TraceSample` 表保存虚构的工位记录，有 `StationCode`、`CompletedAt`、`ResultCode` 等列。要查某个工位当天的结果，可以将日期条件写成半开区间。这既避免遗漏当天最后一刻的记录，也让谓词直接作用在时间列上。

```sql
DECLARE @Start datetime2(0) = '2026-01-15T00:00:00';
DECLARE @End datetime2(0) = DATEADD(day, 1, @Start);

SET STATISTICS IO ON;
SET STATISTICS TIME ON;

SELECT CompletedAt, ResultCode
FROM dbo.TraceSample
WHERE StationCode = N'SIM-01'
  AND CompletedAt >= @Start
  AND CompletedAt < @End
ORDER BY CompletedAt;

SET STATISTICS TIME OFF;
SET STATISTICS IO OFF;
```

在 SQL Server Management Studio 中打开实际执行计划，并保存同一组参数的基线。逻辑读取量统计从缓存读取的数据页次数。在相同的数据和参数下，它通常比单次客户端显示的耗时更便于比较。

## 拿读页与执行计划互相验证

先看扫描的表、估算和实际行数差异、是否有额外排序，再决定候选索引。例如，针对上述查询可在测试表比较 `(StationCode, CompletedAt) INCLUDE (ResultCode)`。等值工位列在前，时间范围列在后，返回结果列可以由索引覆盖。即使执行计划显示索引查找，也要核对实际读取量和返回行数。

用窄时间范围和宽时间范围分别比较，记录逻辑读取、CPU、耗时及结果集是否一致。索引还会增加写入成本和空间占用。演练使用独立测试库，数据量和分布应与验证目标匹配。

参考 [Microsoft Learn 的 SET STATISTICS IO 文档](https://learn.microsoft.com/zh-cn/sql/t-sql/statements/set-statistics-io-transact-sql)。
