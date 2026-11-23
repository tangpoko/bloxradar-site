# Registers the daily catalog run in Windows Task Scheduler (03:20, runs when the PC is next on if it was off).
$cmd = Join-Path $PSScriptRoot 'run-catalog.cmd'
$action = New-ScheduledTaskAction -Execute $cmd
$trigger = New-ScheduledTaskTrigger -Daily -At 3:20am
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 1)
Register-ScheduledTask -TaskName 'BloxRadar catalog' -Action $action -Trigger $trigger -Settings $settings -Force
