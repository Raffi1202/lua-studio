'use strict'
// Nach dem Packen (und nach dem Setzen der Electron-Fuses) die Mac-App ad hoc signieren.
// Ohne neue Signatur beendet macOS die App sofort («Code Signature Invalid»), weil das Setzen der Fuses
// die Programmdatei verändert. Ein Apple-Zertifikat haben wir nicht; ad hoc genügt zum Starten.
const { execFileSync } = require('child_process')
const path = require('path')

exports.default = async function adhocSignieren(context) {
  if (context.electronPlatformName !== 'darwin') return
  const app = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`)
  // Zusatzattribute (Finder, iCloud-Desktop) entfernen, sonst verweigert codesign («detritus not allowed»)
  execFileSync('xattr', ['-cr', app])
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' })
  execFileSync('codesign', ['--verify', '--deep', '--strict', app], { stdio: 'inherit' })
}
