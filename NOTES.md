Query
  StreamSelector
  EventSelector

SteamSelector
Stream: /context/entity/id
- max 3 slashes
- stream[0] == /
- no two successive //
- context and entity [a-z]+
- id [a-z0-9-]+
- /^(?!-)(?!.*--)[a-z0-9-]+(?<!-)$/
