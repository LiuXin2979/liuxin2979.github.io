---
title: "SQL Server 查重：先数重复组，再找明细行"
description: "用 GROUP BY 查单列与组合键重复，再用窗口函数找出每条记录并处理 NULL"
date: "2026-11-06"
minutes: 4
topic: database
tags: ["SQL Server", "T-SQL", "数据质量"]
order: -1
---

这篇文章整理自笔记《sqlserver查询重复数据》。原笔记按单列和多列给了两种写法。实操时还要确定要的是**重复组**还是**重复组里的每一条记录**。以下示例使用表变量，包含两条组合键重复和两条编码缺失的记录。

```sql
DECLARE @Sample TABLE (
    RowId int PRIMARY KEY,
    StationCode nvarchar(12) NOT NULL,
    PartCode nvarchar(12) NULL
);

INSERT INTO @Sample (RowId, StationCode, PartCode)
VALUES
    (1, N'SIM-A', N'P01'),
    (2, N'SIM-A', N'P01'),
    (3, N'SIM-A', N'P02'),
    (4, N'SIM-B', NULL),
    (5, N'SIM-B', NULL);
```

## 先看哪些值重复

把下面的语句接在初始化代码后，在同一批次运行。单列查重按零件编码分组。组合键查重同时按工位和零件编码分组，只有两列对应的值都在同一组时才计为重复。

```sql
SELECT PartCode, COUNT(*) AS RowCount
FROM @Sample
GROUP BY PartCode
HAVING COUNT(*) > 1;

SELECT StationCode, PartCode, COUNT(*) AS RowCount
FROM @Sample
GROUP BY StationCode, PartCode
HAVING COUNT(*) > 1
ORDER BY StationCode, PartCode;
```

组合键查询返回 `SIM-A / P01` 和 `SIM-B / NULL` 两组，每组两条。SQL Server 会将分组列上的 `NULL` 归入同一组。`COUNT(*)` 统计组内的全部行，而 `COUNT(PartCode)` 跳过 `PartCode` 为 `NULL` 的行。如果编码缺失应单独排查，可以在分组前用 `WHERE PartCode IS NOT NULL` 排除。

## 再取出重复组里的记录

用窗口函数在保留明细的同时计算组内行数。这个写法也避免了用等号把分组结果关联回原表时漏掉 `NULL` 的情况。

```sql
;WITH Counted AS (
    SELECT RowId, StationCode, PartCode,
           COUNT(*) OVER (PARTITION BY StationCode, PartCode) AS GroupSize
    FROM @Sample
)
SELECT RowId, StationCode, PartCode, GroupSize
FROM Counted
WHERE GroupSize > 1
ORDER BY RowId;
```

结果中应该看到 `RowId` 为 1、2、4、5 的四条记录。实际排查时，先确认参与查重的业务键和空值规则，再看这些记录的时间、来源等字段。仅按结果数量无法判断两条记录是重复上报还是两次有效事件。

参考 [Microsoft Learn 的 GROUP BY 文档](https://learn.microsoft.com/en-us/sql/t-sql/queries/select-group-by-transact-sql?view=sql-server-ver17) 和 [OVER 子句文档](https://learn.microsoft.com/en-us/sql/t-sql/queries/select-over-clause-transact-sql?view=sql-server-ver17)。
