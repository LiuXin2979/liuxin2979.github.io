---
title: "WinForms 后台采集怎样安全刷新界面"
description: "让后台线程只发布快照，界面线程负责显示，避免跨线程更新和关闭窗体时的竞态"
date: "2026-11-06"
minutes: 4
topic: desktop
tags: ["C#", "WinForms", "异步"]
order: 1
---

## 把采集和刷新拆成两件事

设备数据可能在后台线程陆续到达。WinForms 控件由创建它们的界面线程管理，采集回调直接设置 `Label.Text` 会破坏这条边界。先把采集结果写成不可变快照，再由界面线程读取，可以把设备频率与界面刷新频率分开。

例如，采集端每秒产生多条读数，趋势图或标签只需要显示最近一条。在界面线程上用 `System.Windows.Forms.Timer` 每 200 ms 读取一次最新快照，后台就不用为每条读数都排队调用 `BeginInvoke`。

```csharp
private sealed class Sample
{
    public Sample(double value, DateTime timestampUtc)
    {
        Value = value;
        TimestampUtc = timestampUtc;
    }

    public double Value { get; }
    public DateTime TimestampUtc { get; }
}

private Sample _latest;

// 单一采集线程调用，不接触控件。
private void OnSample(double value)
{
    Volatile.Write(ref _latest, new Sample(value, DateTime.UtcNow));
}

// System.Windows.Forms.Timer 的 Tick 在 UI 线程运行。
private void RefreshTick(object sender, EventArgs e)
{
    var sample = Volatile.Read(ref _latest);
    if (sample == null)
        return;

    valueLabel.Text = sample.Value.ToString("F2");
    timestampLabel.Text = sample.TimestampUtc.ToLocalTime().ToString("HH:mm:ss");
}
```

代码中的 `Volatile` 来自 `System.Threading`。这个方案适合状态读数和预览。报警、结果入库和完整曲线应使用独立的可靠通道，因为快照只保留最新值。

## 关闭窗体时怎么收尾

关闭时先停刷新定时器，取消订阅或通知采集端退出，再释放相关资源。等待采集线程结束的步骤应避免同步阻塞界面线程。需要保留最后一条数据时，应把它交给独立的保存流程。

可以用模拟采集源验证三个场景。界面短暂忙碌后仍能显示新读数，暂停采集后保留最后更新时间，连续打开和关闭窗口也不会残留采集订阅。

参考 [Microsoft Learn 的 WinForms 线程安全调用指南](https://learn.microsoft.com/zh-cn/dotnet/desktop/winforms/controls/how-to-make-thread-safe-calls)。
