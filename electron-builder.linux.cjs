const fs = require('node:fs')
const packageJson = require('./package.json')

// Linux is not a supported release target yet: the Office runtime lock has no
// linux target and the macOS/Windows packaging gates do not apply. This config
// produces a local AppImage for evaluation only, and skips the gates that
// assume a notarized macOS bundle or a Windows .exe (prepare-dmg-background,
// after-pack, notarize).
const build = { ...packageJson.build }

delete build.beforePack
delete build.afterPack
delete build.afterSign
delete build.mac
delete build.dmg
delete build.win
delete build.nsis
delete build.detectUpdateChannel

const officeRuntime = fs.existsSync('.build/office-runtime')
build.extraResources = build.extraResources.filter((entry) => {
  if (!entry) return true
  if (entry.from === '.build/office-runtime') return officeRuntime
  // Harness boot aborts when the activation patch names the Office plugin and
  // its runtime payload is absent, so Linux ships a patch without that insert.
  if (entry.from === 'build/dsh-desktop.patch.yml') return false
  return true
})
build.extraResources.push({
  from: 'build/dsh-desktop.linux.patch.yml',
  to: 'dsh-desktop.patch.yml'
})

module.exports = {
  ...build,
  appId: 'io.dsh.desktop',
  artifactName: 'dsh-desktop-linux-${arch}.${ext}',
  publish: null,
  // electron-builder 26 still defaults to the FUSE2 AppImage toolset (0.0.0),
  // whose runtime dlopen()s libfuse.so.2. Distributions that only ship FUSE3
  // (Ubuntu 24.04+/26.04, Debian 13, Fedora 41+) no longer have that library,
  // so the AppImage dies with "error loading libfuse.so.2" before any of our
  // code runs. The >= 1.0.0 toolsets embed a static runtime and need no FUSE.
  toolsets: { appimage: '1.0.3' },
  linux: {
    target: [{ target: 'AppImage', arch: ['x64'] }],
    category: 'Development',
    icon: 'build/icon.png',
    synopsis: 'Desktop shell for DeepSeek Harness',
    description: 'A cross-platform desktop shell for DeepSeek Harness.',
    desktop: {
      entry: {
        Name: 'DSH Desktop',
        Comment: 'Desktop shell for DeepSeek Harness'
      }
    },
    // Electron uses desktopName as app_id / WM_CLASS; without it the desktop
    // environment cannot associate the running window with this .desktop entry.
    syncDesktopName: true
  },
  extraMetadata: { desktopName: 'dsh-desktop' }
}
