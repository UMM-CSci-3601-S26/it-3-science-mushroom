export interface DialogData {
  title: string; // Required title field for all dialog
  message?: string; // Optional message field for all dialog
  messageArray?: string[]; // Optional message array field for all dialog
  reportName?: string; // reportName field for Stock Report dialog
  buttonOne?: string; // Left Button (usually Cancel, No, etc)
  buttonTwo?: string; // Right Button (usually Confirm, Yes, etc)
  familyName?: string; // familyName field for Delete Family dialog
}
