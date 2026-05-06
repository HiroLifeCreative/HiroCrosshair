; HiroCrosshair — NSIS hooks included by Tauri's installer.nsi
; The installer launcher creates/deletes a temp marker before running setup.exe:
;   $TEMP\hiro-crosshair-no-desktop.marker
; If present after shortcuts are created, remove only the desktop shortcut (start menu remains).

!macro NSIS_HOOK_POSTINSTALL
  IfFileExists "$TEMP\hiro-crosshair-no-desktop.marker" 0 hiro_skip_desktop_rm
    IfFileExists "$DESKTOP\${PRODUCTNAME}.lnk" 0 +1
      Delete "$DESKTOP\${PRODUCTNAME}.lnk"
    Delete "$TEMP\hiro-crosshair-no-desktop.marker"
  hiro_skip_desktop_rm:
!macroend

!macro NSIS_HOOK_PREINSTALL
!macroend

!macro NSIS_HOOK_PREUNINSTALL
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
!macroend
