---
title: "C# 委托调用、子线程与线程池"
description: "对比 Invoke、BeginInvoke、Thread 和 ThreadPool，并说明旧版 WinForms 代码怎样迁移到 Task"
date: "2026-11-06"
minutes: 6
topic: desktop
tags: ["C#", ".NET Framework", "线程池", "WinForms"]
order: -4
---

这篇文章整理自《委托调用、子线程调用、线程池调用》。三种调用方式都可以用同一个问题来比较：调用发出后，工作在哪个线程执行，调用方又怎样拿到结果？

## 1. 委托调用

### 同步调用 Invoke

直接调用委托或调用它的 `Invoke`，目标方法都在调用方线程执行。方法返回后，调用方才能继续。如果从 WinForms 按钮事件同步执行耗时任务，界面线程就会一直忙到该方法返回。

### 异步调用 BeginInvoke 和 EndInvoke

在 **.NET Framework** 中，委托的 `BeginInvoke` 把目标方法排到线程池，并返回一个 `IAsyncResult`。同一委托的 `EndInvoke` 取回返回值。如果工作还没完成，`EndInvoke` 会等待。每次调用 `BeginInvoke` 都要配对调用 `EndInvoke`，也可以在完成回调里取结果。

下面的控制台例子用线程 ID 和 `IsThreadPoolThread` 观察执行位置。异步方法的日志与主线程日志的先后顺序由调度决定。

```csharp
using System;
using System.Threading;

public static class DelegateDemo
{
    private delegate int AddHandler(int x, int y);

    private static int Add(int x, int y)
    {
        var thread = Thread.CurrentThread;
        Console.WriteLine(
            $"执行线程 {thread.ManagedThreadId}，线程池 {thread.IsThreadPoolThread}");
        return x + y;
    }

    public static void Main()
    {
        Console.WriteLine($"调用线程 {Thread.CurrentThread.ManagedThreadId}");
        AddHandler handler = Add;

        Console.WriteLine($"同步结果 {handler.Invoke(1, 2)}");

        // 此段委托异步调用用于 .NET Framework。
        IAsyncResult pending = handler.BeginInvoke(1, 2, null, null);
        Console.WriteLine("主线程可在此继续工作");
        Console.WriteLine($"异步结果 {handler.EndInvoke(pending)}");
    }
}
```

委托的 `BeginInvoke` 和 `EndInvoke` 依赖 .NET Framework 的运行时支持。迁移到 .NET Core 或现代 .NET 时，可以把同步计算放入 `Task.Run`，再用 `await` 取得结果。WinForms 的 `Control.BeginInvoke` 是另一项 API，它把回调排到控件所属的界面线程，常用于[跨线程刷新界面](/posts/winforms-ui-thread/)。

## 2. 子线程调用 Thread

需要一个独立线程时，可以使用 `Thread`。构造函数接收要在线程上执行的委托。用 lambda 包住带参数的方法，参数就会在该方法真正执行时使用。以下示例用 `Join` 等待线程结束，然后读取结果。

```csharp
using System;
using System.Threading;

public static class ThreadDemo
{
    private static int SumTo(int limit)
    {
        int total = 0;
        for (int i = 1; i <= limit; i++)
            total += i;

        return total;
    }

    public static void Main()
    {
        int result = 0;
        var worker = new Thread(() => { result = SumTo(1000); });

        worker.Start();
        Console.WriteLine("调用方可在等待之前执行其他工作");

        worker.Join();
        Console.WriteLine(result); // 500500
    }
}
```

`new Thread(() => SumTo(1000))` 传递的是待执行的代码。直接写 `new Thread(SumTo(1000))` 则会先求和，再尝试把整数传给构造函数。`Join` 会阻塞调用方，适合这个控制台演示。界面事件里需要等待结果时，可以用可等待的任务。

需要中途停止时，让工作方法检查 `CancellationToken`，在合适的位置退出并释放资源。旧版 `Thread.Abort` 可能在操作尚未完成时打断线程，现代 .NET 已停用该 API。

## 3. 线程池调用 ThreadPool

线程池由运行时管理。调用 `ThreadPool.QueueUserWorkItem` 时，提交的是一个工作项。线程池可以复用已有线程，工作项也可能排队等待。原笔记里的 `WaitCallback` 可以接收一个状态对象，例如：

```csharp
using System.Diagnostics;
using System.Threading;

public static class ThreadPoolDemo
{
    public static void QueueExample()
    {
        ThreadPool.QueueUserWorkItem(state =>
        {
            int count = (int)state;
            Debug.WriteLine($"后台工作项收到 {count}");
        }, 44);
    }
}
```

这个例子只演示排队和传参。状态对象如果是由多个线程共同修改的引用对象，仍需协调访问。也应控制阻塞工作项的数量，因为它们可能占住线程池线程，延迟其他任务。

对于要取返回值、处理异常的 WinForms 计算，可以用 `Task.Run` 得到一个 `Task<T>`，再在按钮事件里等待它。

```csharp
// 窗体方法。SumTo 使用上文的实现。
private async void calculateButton_Click(object sender, EventArgs e)
{
    calculateButton.Enabled = false;

    try
    {
        int result = await Task.Run(() => SumTo(1000));
        resultLabel.Text = result.ToString();
    }
    finally
    {
        calculateButton.Enabled = true;
    }
}
```

这里把 CPU 计算交给线程池。按钮事件从界面线程进入，普通的 `await` 完成后回到界面线程更新控件。如果等待的是文件、数据库或网络，而接口已经提供异步方法，可以直接等待该方法。

参考 [委托异步调用的迁移说明](https://devblogs.microsoft.com/dotnet/migrating-delegate-begininvoke-calls-for-net-core/)、[托管线程池](https://learn.microsoft.com/en-us/dotnet/standard/threading/the-managed-thread-pool)和 [C# 异步编程场景](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/async-scenarios)。
