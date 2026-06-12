!include LogicLib.nsh
!include nsDialogs.nsh

!ifndef BUILD_UNINSTALLER
Var /GLOBAL CreateDesktopShortcut
Var /GLOBAL DesktopShortcutCheckbox
Var /GLOBAL SkipDesktopShortcutPrompt

!macro customInit
  ${If} ${isUpdated}
    StrCpy $SkipDesktopShortcutPrompt "true"
  ${Else}
    StrCpy $SkipDesktopShortcutPrompt "false"
  ${EndIf}

  ${If} ${isNoDesktopShortcut}
    StrCpy $CreateDesktopShortcut ${BST_UNCHECKED}
  ${Else}
    StrCpy $CreateDesktopShortcut ${BST_CHECKED}
  ${EndIf}
!macroend

!macro customPageAfterChangeDir
  Page custom DesktopShortcutPageCreate DesktopShortcutPageLeave
!macroend

Function DesktopShortcutPageCreate
  IfSilent 0 +2
    Abort

  ${If} $SkipDesktopShortcutPrompt == "true"
    Abort
  ${EndIf}

  nsDialogs::Create 1018
  Pop $0

  ${If} $0 == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 24u "Choose whether Dinox should create a shortcut on your desktop."
  Pop $0

  ${NSD_CreateCheckbox} 0 34u 100% 12u "Create a desktop shortcut"
  Pop $DesktopShortcutCheckbox
  ${NSD_SetState} $DesktopShortcutCheckbox $CreateDesktopShortcut

  nsDialogs::Show
FunctionEnd

Function DesktopShortcutPageLeave
  ${NSD_GetState} $DesktopShortcutCheckbox $CreateDesktopShortcut
FunctionEnd

!macro customInstall
  ${If} $SkipDesktopShortcutPrompt != "true"
  ${AndIf} $CreateDesktopShortcut == ${BST_CHECKED}
    CreateShortCut "$DESKTOP\${SHORTCUT_NAME}.lnk" "$appExe" "" "$appExe" 0 "" "" "${APP_DESCRIPTION}"
    ClearErrors
    WinShell::SetLnkAUMI "$DESKTOP\${SHORTCUT_NAME}.lnk" "${APP_ID}"
    System::Call 'Shell32::SHChangeNotify(i 0x8000000, i 0, i 0, i 0)'
  ${EndIf}
!macroend
!endif
