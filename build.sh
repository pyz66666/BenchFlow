#!/bin/bash
#
# BenchFlow 一键打包脚本
# 用法:
#   ./build.sh mac          # 打包 macOS (dmg)
#   ./build.sh win          # 打包 Windows (exe)
#   ./build.sh all          # 打包全部
#   ./build.sh release      # 打包全部并发布到 GitHub Release
#

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

# 自动加载 .env
[ -f .env ] && export $(grep -v '^#' .env | xargs)

export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
export ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"

# GitHub 配置 (从环境变量读取 token)
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
GITHUB_REPO="pyz66666/BenchFlow"

VERSION=$(node -p "require('./package.json').version")
TAG="v${VERSION}"

echo "========================================"
echo "  BenchFlow v${VERSION} 打包脚本"
echo "========================================"

run_typecheck() {
    echo "[1/3] 类型检查..."
    npx vue-tsc --noEmit
    echo "  ✓ 类型检查通过"
}

run_build() {
    echo "[2/3] 构建前端 + Electron..."
    npx vite build
    echo "  ✓ 构建完成"
}

build_mac() {
    echo "[3/3] 打包 macOS..."
    npx electron-builder --mac
    echo "  ✓ macOS 打包完成"
}

build_win() {
    echo "[3/3] 打包 Windows..."
    npx electron-builder --win --x64
    echo "  ✓ Windows 打包完成"
}

show_artifacts() {
    echo ""
    echo "========================================"
    echo "  打包产物 (release/)"
    echo "========================================"
    ls -lh release/*.dmg release/*.exe 2>/dev/null || echo "  无产物"
}

upload_to_release() {
    echo ""
    echo "========================================"
    echo "  发布到 GitHub Release"
    echo "========================================"

    # 创建 tag
    echo "创建 tag: ${TAG}"
    git tag -a "${TAG}" -m "BenchFlow ${TAG}" 2>/dev/null || true
    git push origin "${TAG}" 2>/dev/null || true

    # 查找已有的 Release 或创建新的
    echo "检查 Release..."
    RESPONSE=$(curl -s -H "Authorization: token ${GITHUB_TOKEN}" \
        "https://api.github.com/repos/${GITHUB_REPO}/releases/tags/${TAG}")

    UPLOAD_URL=$(echo "$RESPONSE" | grep -o '"upload_url":"[^"]*"' | head -1 | cut -d'"' -f4 | sed 's/{?name,label}//')
    RELEASE_ID=$(echo "$RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

    if [ -z "$UPLOAD_URL" ]; then
        echo "创建新 Release..."
        RESPONSE=$(curl -s -X POST \
            -H "Authorization: token ${GITHUB_TOKEN}" \
            -H "Content-Type: application/json" \
            -d "{\"tag_name\":\"${TAG}\",\"name\":\"BenchFlow ${TAG}\",\"body\":\"BenchFlow ${TAG} 发布\"}" \
            "https://api.github.com/repos/${GITHUB_REPO}/releases")
        UPLOAD_URL=$(echo "$RESPONSE" | grep -o '"upload_url":"[^"]*"' | head -1 | cut -d'"' -f4 | sed 's/{?name,label}//')
    fi

    if [ -z "$UPLOAD_URL" ]; then
        echo "  ✗ 无法获取 upload_url"
        echo "  响应: $(echo $RESPONSE | head -5)"
        return 1
    fi

    if [ -z "$GITHUB_TOKEN" ]; then
        echo "  ⚠ GITHUB_TOKEN 未设置，请创建 .env 文件："
        echo "    echo 'GITHUB_TOKEN=你的token' > .env"
        return 1
    fi

    echo "Upload URL: ${UPLOAD_URL}"

    # 上传 Windows exe
    EXE_FILE=$(ls release/*.exe 2>/dev/null | head -1)
    if [ -n "$EXE_FILE" ]; then
        EXE_NAME="BenchFlow-Setup-${VERSION}.exe"
        echo "上传 ${EXE_NAME}..."
        RESULT=$(curl -s -X POST \
            -H "Authorization: token ${GITHUB_TOKEN}" \
            -H "Content-Type: application/octet-stream" \
            --data-binary @"$EXE_FILE" \
            "${UPLOAD_URL}?name=${EXE_NAME}")
        STATE=$(echo "$RESULT" | grep -o '"state":"[^"]*"' | head -1)
        echo "  $STATE"
    fi

    # 上传 macOS dmg
    DMG_FILE=$(ls release/*.dmg 2>/dev/null | head -1)
    if [ -n "$DMG_FILE" ]; then
        DMG_NAME="BenchFlow-${VERSION}-arm64.dmg"
        echo "上传 ${DMG_NAME}..."
        RESULT=$(curl -s -X POST \
            -H "Authorization: token ${GITHUB_TOKEN}" \
            -H "Content-Type: application/octet-stream" \
            --data-binary @"$DMG_FILE" \
            "${UPLOAD_URL}?name=${DMG_NAME}")
        STATE=$(echo "$RESULT" | grep -o '"state":"[^"]*"' | head -1)
        echo "  $STATE"
    fi

    echo ""
    echo "  ✓ 发布完成"
    echo "  Release: https://github.com/${GITHUB_REPO}/releases/tag/${TAG}"
}

case "${1:-all}" in
    mac)
        run_typecheck
        run_build
        build_mac
        show_artifacts
        ;;
    win)
        run_typecheck
        run_build
        build_win
        show_artifacts
        ;;
    all)
        run_typecheck
        run_build
        build_mac
        build_win
        show_artifacts
        ;;
    release)
        run_typecheck
        run_build
        build_mac
        build_win
        show_artifacts
        upload_to_release
        ;;
    *)
        echo "用法: ./build.sh [mac|win|all|release]"
        echo "  mac     - 仅打包 macOS"
        echo "  win     - 仅打包 Windows"
        echo "  all     - 打包全部 (默认)"
        echo "  release - 打包全部并发布到 GitHub Release"
        exit 1
        ;;
esac

echo ""
echo "完成!"
