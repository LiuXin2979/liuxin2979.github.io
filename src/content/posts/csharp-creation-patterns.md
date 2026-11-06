---
title: "C# 创建型模式怎么选"
description: "从单例、工厂到建造者，用报表输出的例子区分实例数量、类型选择和装配步骤"
date: "2026-11-06"
minutes: 5
topic: desktop
tags: ["C#", "设计模式", ".NET"]
order: -3
---

这篇文章整理自笔记《C#设计模式》。原笔记将单例、三种工厂和建造者放在一起。用报表输出举例，可以从三个问题来区分它们。要创建几个实例？谁来选择具体类型？对象是否需要分步骤组装？

## 单例处理实例数量

单例把构造入口收进类型内部，让调用方通过同一个入口取实例。需要推迟创建时，可以用 `Lazy<T>` 管理初始化。例如，一个不保存任务状态的报表单位目录可以按需创建。

```csharp
using System;

public sealed class ReportUnits
{
    private static readonly Lazy<ReportUnits> Shared =
        new Lazy<ReportUnits>(() => new ReportUnits());

    private ReportUnits()
    {
    }

    public static ReportUnits Instance => Shared.Value;

    public string QuantityUnit => "件";
}
```

这里的 `Lazy<T>` 使用默认的线程安全初始化。它解决的是多个线程同时首次取实例的问题。如果以后加入可变缓存，还要单独设计并发访问。把当前任务的筛选条件放进共享实例，会让两个任务相互影响。

## 工厂处理类型选择

假设程序支持纯文本和 Markdown 两种输出，调用方只依赖 `IReportFormatter`。如果类型由配置决定，简单工厂可以集中处理映射。下面的例子把输入限定为行数，用来展示选择过程。

```csharp
using System;

public enum ReportFormat
{
    PlainText,
    Markdown
}

public interface IReportFormatter
{
    string Format(int rowCount);
}

public sealed class PlainTextFormatter : IReportFormatter
{
    public string Format(int rowCount) => $"记录数 {rowCount}";
}

public sealed class MarkdownFormatter : IReportFormatter
{
    public string Format(int rowCount) => $"**记录数** {rowCount}";
}

public static class ReportFormatterFactory
{
    public static IReportFormatter Create(ReportFormat format)
    {
        switch (format)
        {
            case ReportFormat.PlainText:
                return new PlainTextFormatter();
            case ReportFormat.Markdown:
                return new MarkdownFormatter();
            default:
                throw new ArgumentOutOfRangeException(nameof(format));
        }
    }
}
```

当两个导出流程共享“读取数据、格式化、写出”的主流程，但由各自的子类决定使用哪个格式器时，可以把创建格式器的步骤提成**工厂方法**。如果每种输出还需要一套彼此配套的表格渲染器、标题渲染器和转义规则，则可用**抽象工厂**一次提供同一格式的组件族。

## 建造者处理装配过程

一份日报可能要添加标题、按班次分组，再附上小计和异常清单。如果多个调用方以不同组合生成报告，可以把这些步骤收进建造者，最后在 `Build()` 里验证必填项并交付报告对象。调用方能从代码里读出报告由哪些部分组成，成品也可以在创建后保持不可变。

| 遇到的问题 | 可以考虑 |
| --- | --- |
| 同一应用内需要共享一个实例 | 单例或由依赖注入容器管理实例 |
| 从配置值选择一个实现 | 简单工厂 |
| 基类固定流程，子类决定创建哪个实现 | 工厂方法 |
| 需要成套创建多个相互配合的对象 | 抽象工厂 |
| 对象需多步装配，并在交付前统一验证 | 建造者 |

参考 [Microsoft Learn 的延迟初始化指南](https://learn.microsoft.com/en-us/dotnet/framework/performance/lazy-initialization)。
