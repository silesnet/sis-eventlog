# SIS Eventlog

## Installation

### Windows

#### Download binaries

```
curl -fsSLO https://github.com/denoland/deno/releases/download/v1.24.2/deno-x86_64-pc-windows-msvc.zip
curl -fsSLO https://www.sqlite.org/2022/sqlite-tools-win32-x86-3390200.zip
curl -fsSLO https://packages.timber.io/vector/0.23.0/vector-0.23.0-x86_64-pc-windows-msvc.zip
curl -fsSLO https://github.com/winsw/winsw/releases/download/v2.11.0/WinSW-x64.exe
```

Extract binaries from the archives into `bin` subfolder and test version.

```
bin\deno.exe -V
bin\sqlite3.exe -version
bin\vector.exe -V
bin\winsw.exe
```

Locally build the application.
```
deno bundle app/api-server.ts > build/eventlog.ts 
```

Copy `eventlog.ts` to destination.

Test invocation.

```cmd
bin\deno.exe run -A eventlog.ts eventlog.db

@ in new cmd
curl http://localhost:9999/events -d "{\"occurredAt\": \"2022-08-06T11:45:23.654Z\", \"stream\": \"/\", \"origin\": \"ledger\", \"publisher\": \"test\", \"event\": \"EventlogInstalled\"}"

@ in new cmd
bin\sqlite3.exe eventolog.db
...
> select * from events;
...
.quit
```
Copy `bin\winsw.exe` to `bin\eventlog-svc.exe`.
Configure service in `bin\eventlog-svc.xml`
```xml
<service>
  <id>sis-eventlog</id>
  <name>SIS EventLog</name>
  <description>SIS EventLog</description>
  <executable>deno.exe</executable>
  <arguments>run -A eventlog.ts eventlog.db</arguments>
  <log mode="roll">
    <logpath>log</logpath>
  </log>
</service>
```

Install and run the service.
```cmd
bin\eventlog-svc.exe install
bin\eventlog-svc.exe start

@rem bin\eventlog-svc.exe stop
@rem bin\eventlog-svc.exe uninstall
```
