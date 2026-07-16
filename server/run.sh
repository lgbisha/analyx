#!/bin/bash
# 启动单个垂直应用。环境变量从同目录 .env 读取。
cd "$(dirname "$0")"
# 兼容 nvm 安装的 node
[ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1
command -v node >/dev/null 2>&1 || export PATH="$HOME/.nvm/versions/node/v22.19.0/bin:$PATH"
exec node --env-file="${ENV_FILE:-.env}" --import tsx src/index.ts
