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

export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
export ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"

VERSION=$(node -p "require('./package.json').version")

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

        echo ""
        echo "========================================"
        echo "  发布到 GitHub Release"
        echo "========================================"

        TAG="v${VERSION}"
        echo "创建 tag: ${TAG}"
        git tag -a "${TAG}" -m "BenchFlow ${TAG}"
        git push origin "${TAG}" 2>/dev/null || true

        if command -v gh &> /dev/null; then
            echo "使用 gh CLI 发布..."
            gh release create "${TAG}" \
                --title "BenchFlow ${TAG}" \
                --notes "BenchFlow ${TAG} 发布" \
                release/*.dmg release/*.exe
            echo "  ✓ 已发布到 GitHub Release"
        else
            echo "  ⚠ gh CLI 未安装，请手动上传以下文件到 GitHub Release:"
            echo "    https://github.com/pyz66666/BenchFlow/releases/new?tag=${TAG}"
            ls -lh release/*.dmg release/*.exe 2>/dev/null
        fi
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
