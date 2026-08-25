export type ManagerMessageParamSpec = 'string' | 'number' | 'boolean' | readonly string[]

export type ManagerMessageDefinition = {
  defaultMessage: string
  params?: Record<string, ManagerMessageParamSpec>
}

export const MANAGER_CATALOG_VERSION = 6

export const managerMessages = {
  'brand.name': { defaultMessage: 'Rakun' },
  'brand.tagline': { defaultMessage: 'Manager' },

  'seo.title': { defaultMessage: 'Rakun Manager' },
  'seo.description': {
    defaultMessage: 'Rakun content management system.',
  },

  'navUser.account': { defaultMessage: 'Account' },

  'navUser.logOut': { defaultMessage: 'Log out' },
  'navUser.language': { defaultMessage: 'Languages' },
  'navUser.theme.light': { defaultMessage: 'Light' },
  'navUser.theme.dark': { defaultMessage: 'Dark' },

  'sidebar.mediaLibrary': { defaultMessage: 'Media Library' },
  'sidebar.seo': { defaultMessage: 'SEO' },
  'sidebar.users': { defaultMessage: 'Users' },
  'sidebar.apiRoutes': { defaultMessage: 'API Routes' },
  'sidebar.debugging': { defaultMessage: 'Debugging' },
  'sidebar.settings': { defaultMessage: 'Settings' },
  'sidebar.visitSite': { defaultMessage: 'Visit site' },
  'sidebar.help': { defaultMessage: 'Help' },
  'sidebar.plugins': { defaultMessage: 'Plugins' },
  'sidebar.contentTypes': { defaultMessage: 'Content types' },

  'nav.dashboard': { defaultMessage: 'Dashboard' },
  'nav.toggleSidebar': { defaultMessage: 'Toggle Sidebar' },

  'seoAudit.title': { defaultMessage: 'SEO' },
  'seoAudit.description': {
    defaultMessage:
      'Audit the published pages of the site and keep dated reports to track their evolution.',
  },
  'seoAudit.generate': { defaultMessage: 'Generate report' },
  'seoAudit.regenerate': { defaultMessage: 'Generate new report' },
  'seoAudit.generated': { defaultMessage: 'SEO report generated and saved.' },
  'seoAudit.generateError': { defaultMessage: 'The SEO report could not be generated.' },
  'contentEdit.seoAnalysisSaveError': {
    defaultMessage: 'The SEO report was generated but could not be saved to the history.',
  },
  'contentEdit.seoHistoryTitle': { defaultMessage: 'Previous reports' },
  'contentEdit.seoHistoryDescription': {
    defaultMessage: 'Open a saved report to review how this page has evolved.',
  },
  'contentEdit.seoHistoryCurrent': { defaultMessage: 'Back to current report' },
  'contentEdit.seoHistoryLoading': { defaultMessage: 'Loading previous reports…' },
  'contentEdit.seoHistoryLoadError': {
    defaultMessage: 'Previous SEO reports could not be loaded.',
  },
  'contentEdit.seoHistoryEmpty': {
    defaultMessage: 'There are no saved reports for this page and language yet.',
  },
  'contentEdit.seoHistoryScore': {
    defaultMessage: '{score}/100',
    params: { score: 'number' },
  },
  'contentEdit.seoHistoryViewing': { defaultMessage: 'Viewing saved report' },
  'contentEdit.seoHistorySnapshotTitle': { defaultMessage: 'Saved findings' },
  'contentEdit.seoHistorySnapshotDescription': {
    defaultMessage:
      'This older snapshot contains the check results but predates full report storage.',
  },
  'seoAudit.scope': {
    defaultMessage: '{count} routable content types are included in this audit.',
    params: { count: 'number' },
  },
  'seoAudit.score': { defaultMessage: 'Score' },
  'seoAudit.scoreValue': {
    defaultMessage: '{score}/100',
    params: { score: 'number' },
  },
  'seoAudit.documents': { defaultMessage: 'Published pages' },
  'seoAudit.errors': { defaultMessage: 'Errors' },
  'seoAudit.warnings': { defaultMessage: 'Warnings' },
  'seoAudit.pagesTitle': { defaultMessage: 'Page results' },
  'seoAudit.pagesDescription': {
    defaultMessage: 'Open a page to see its findings and jump directly to the document.',
  },
  'seoAudit.issueCount': {
    defaultMessage: '{count} findings',
    params: { count: 'number' },
  },
  'seoAudit.noIssues': { defaultMessage: 'No metadata findings for this page.' },
  'seoAudit.openDocument': { defaultMessage: 'Open document' },
  'seoAudit.emptyTitle': { defaultMessage: 'No SEO reports yet' },
  'seoAudit.emptyDescription': {
    defaultMessage: 'Generate the first report to establish the site baseline.',
  },
  'seoAudit.historyTitle': { defaultMessage: 'Evolution' },
  'seoAudit.historyDescription': {
    defaultMessage: 'Every site audit is stored with its date so changes can be tracked over time.',
  },
  'seoAudit.historySummary': {
    defaultMessage: '{documents} pages · {errors} errors · {warnings} warnings',
    params: { documents: 'number', errors: 'number', warnings: 'number' },
  },
  'seoAudit.noHistory': { defaultMessage: 'There are no saved site audits.' },
  'seoAudit.pageHistoryTitle': { defaultMessage: 'Recent page reports' },
  'seoAudit.pageHistoryDescription': {
    defaultMessage: 'Reports generated from the SEO tab of individual documents.',
  },
  'seoAudit.finding.missingTitle': { defaultMessage: 'The page has no SEO title.' },
  'seoAudit.finding.defaultTitle': {
    defaultMessage: 'The page uses the global default SEO title.',
  },
  'seoAudit.finding.titleLength': {
    defaultMessage: 'The title is outside the recommended length.',
  },
  'seoAudit.finding.missingDescription': {
    defaultMessage: 'The page has no meta description.',
  },
  'seoAudit.finding.defaultDescription': {
    defaultMessage: 'The page uses the global default meta description.',
  },
  'seoAudit.finding.descriptionLength': {
    defaultMessage: 'The description is outside the recommended length.',
  },
  'seoAudit.finding.noIndex': { defaultMessage: 'The page declares noindex.' },
  'seoAudit.finding.missingCanonicalBase': {
    defaultMessage: 'There is no canonical URL and the site URL is not configured.',
  },
  'seoAudit.finding.incompleteOpenGraph': {
    defaultMessage: 'Custom Open Graph is missing: {fields}.',
    params: { fields: 'string' },
  },
  'seoAudit.finding.duplicateTitle': {
    defaultMessage: 'The SEO title is also used by another page.',
  },
  'seoAudit.finding.duplicateDescription': {
    defaultMessage: 'The meta description is also used by another page.',
  },

  'login.brand': { defaultMessage: 'Rakun Manager' },
  'login.welcome': { defaultMessage: 'Welcome to Rakun Manager' },
  'login.email': { defaultMessage: 'Email' },
  'login.password': { defaultMessage: 'Password' },
  'login.showPassword': { defaultMessage: 'Show password' },
  'login.hidePassword': { defaultMessage: 'Hide password' },
  'login.submit': { defaultMessage: 'Login' },
  'login.or': { defaultMessage: 'Or' },
  'login.github': { defaultMessage: 'GitHub' },
  'login.google': { defaultMessage: 'Google' },
  'login.forgotPassword': { defaultMessage: 'Forgot your password?' },
  'login.emailPlaceholder': { defaultMessage: 'you@example.com' },
  'login.invalidCredentials': {
    defaultMessage: 'The email or password is incorrect.',
  },
  'login.rateLimited': {
    defaultMessage: 'Too many attempts. Wait a few minutes and try again.',
  },
  'login.error': {
    defaultMessage: 'Login could not be completed. Please try again.',
  },
  'login.ipBlocked': {
    defaultMessage: 'This IP address is blocked. Ask an administrator to unblock it.',
  },
  'login.externalCompleting': { defaultMessage: 'Completing login…' },
  'login.externalError': {
    defaultMessage: 'External login could not be completed. Please try again.',
  },
  'login.back': { defaultMessage: 'Back to login' },

  'passwordRecovery.forgotTitle': { defaultMessage: 'Recover your account' },
  'passwordRecovery.forgotDescription': {
    defaultMessage: 'Enter your email and we will send you a time-limited reset link.',
  },
  'passwordRecovery.sendLink': { defaultMessage: 'Send reset link' },
  'passwordRecovery.emailSentTitle': { defaultMessage: 'Check your email' },
  'passwordRecovery.emailSentDescription': {
    defaultMessage:
      'If an account exists for that email, you will receive a password reset link shortly.',
  },
  'passwordRecovery.requestError': {
    defaultMessage: 'The reset request could not be completed. Please try again.',
  },
  'passwordRecovery.invalidEmail': {
    defaultMessage: 'Enter a valid email address.',
  },
  'passwordRecovery.backToLogin': { defaultMessage: 'Back to login' },
  'passwordRecovery.resetTitle': { defaultMessage: 'Choose a new password' },
  'passwordRecovery.resetDescription': {
    defaultMessage: 'Use at least 8 characters. This link can only be used once.',
  },
  'passwordRecovery.newPassword': { defaultMessage: 'New password' },
  'passwordRecovery.passwordRequirements': {
    defaultMessage: 'The password must contain at least 8 characters.',
  },
  'passwordRecovery.confirmPassword': { defaultMessage: 'Confirm new password' },
  'passwordRecovery.passwordsDoNotMatch': {
    defaultMessage: 'The passwords do not match.',
  },
  'passwordRecovery.resetAction': { defaultMessage: 'Reset password' },
  'passwordRecovery.invalidTitle': {
    defaultMessage: 'Invalid recovery link',
  },
  'passwordRecovery.invalidDescription': {
    defaultMessage:
      'This recovery link is invalid, expired, or has already been used. Request a new one.',
  },
  'passwordRecovery.completeTitle': { defaultMessage: 'Password updated' },
  'passwordRecovery.completeDescription': {
    defaultMessage:
      'Your sessions have been closed. You can now log in with your new password. MFA is still required if it is enabled.',
  },

  'dashboard.favorites': { defaultMessage: 'Favorites' },
  'dashboard.notifications': { defaultMessage: 'Notifications' },
  'dashboard.viewAll': { defaultMessage: 'View all' },
  'dashboard.noFavorites': { defaultMessage: 'No favorites yet' },
  'dashboard.noUnreadNotifications': {
    defaultMessage: 'No unread notifications',
  },
  'dashboard.noNotifications': { defaultMessage: 'No notifications yet' },
  'dashboard.notificationsDescription': {
    defaultMessage: 'Latest {count} notifications, including those already viewed.',
    params: { count: 'number' },
  },
  'dashboard.removedFavorite': { defaultMessage: 'Removed from favorites' },
  'dashboard.removeFavoriteError': {
    defaultMessage: 'Could not remove favorite',
  },

  'settings.reviewPolicies': { defaultMessage: 'Review Policies' },
  'settings.languages': { defaultMessage: 'Languages' },
  'settings.routes': { defaultMessage: 'Routes' },
  'settings.system': { defaultMessage: 'System' },
  'settings.security': { defaultMessage: 'Security' },
  'settings.security.title': { defaultMessage: 'Blocked login IPs' },
  'settings.security.description': {
    defaultMessage:
      'An IP is blocked permanently after {count, plural, one {# failed attempt} other {# failed attempts}}.',
  },
  'settings.security.disabled': { defaultMessage: 'Password IP blocking is disabled.' },
  'settings.security.noBlockedIps': { defaultMessage: 'There are no blocked IP addresses.' },
  'settings.security.loadError': { defaultMessage: 'Blocked IP addresses could not be loaded.' },
  'settings.security.ip': { defaultMessage: 'IP address' },
  'settings.security.attempts': { defaultMessage: 'Failed attempts' },
  'settings.security.lastFailedAt': { defaultMessage: 'Last failed attempt' },
  'settings.security.blockedAt': { defaultMessage: 'Blocked at' },
  'settings.security.actions': { defaultMessage: 'Actions' },
  'settings.security.unblock': { defaultMessage: 'Unblock' },
  'settings.security.unblocked': { defaultMessage: 'The IP address was unblocked.' },
  'settings.security.unblockError': {
    defaultMessage: 'The IP address could not be unblocked.',
  },
  'settings.security.recentFailures': { defaultMessage: 'Recent failed logins' },
  'settings.security.recentFailuresDescription': {
    defaultMessage: 'The 25 most recent password-login failures from the API event log.',
  },
  'settings.security.noRecentFailures': { defaultMessage: 'There are no recent failed logins.' },
  'settings.security.occurredAt': { defaultMessage: 'Date' },
  'settings.security.result': { defaultMessage: 'Result' },
  'settings.security.blocked': { defaultMessage: 'IP blocked' },
  'settings.security.failed': { defaultMessage: 'Failed' },
  'settings.security.unknownIp': { defaultMessage: 'Unavailable' },
  'settings.userRoles': { defaultMessage: 'User Roles' },
  'settings.literals': { defaultMessage: 'Literals' },
  'settings.redirects': { defaultMessage: 'Redirects' },
  'settings.robots': { defaultMessage: 'Robots' },
  'settings.seo': { defaultMessage: 'SEO' },
  'settings.llms': { defaultMessage: 'AI content' },
  'settings.logs': { defaultMessage: 'Logs' },
  'settings.logs.description': {
    defaultMessage:
      'Inspect persistent system events and narrow them by type, result, source, tags or date.',
  },
  'settings.logs.type': { defaultMessage: 'Event type' },
  'settings.logs.category': { defaultMessage: 'Category' },
  'settings.logs.outcome': { defaultMessage: 'Outcome' },
  'settings.logs.outcome.pending': { defaultMessage: 'Pending' },
  'settings.logs.outcome.success': { defaultMessage: 'Success' },
  'settings.logs.outcome.failure': { defaultMessage: 'Failure' },
  'settings.logs.outcome.neutral': { defaultMessage: 'Neutral' },
  'settings.logs.severity': { defaultMessage: 'Severity' },
  'settings.logs.severity.debug': { defaultMessage: 'Debug' },
  'settings.logs.severity.info': { defaultMessage: 'Info' },
  'settings.logs.severity.warning': { defaultMessage: 'Warning' },
  'settings.logs.severity.error': { defaultMessage: 'Error' },
  'settings.logs.severity.critical': { defaultMessage: 'Critical' },
  'settings.logs.source': { defaultMessage: 'Source' },
  'settings.logs.correlationId': { defaultMessage: 'Correlation ID' },
  'settings.logs.tags': { defaultMessage: 'Tags' },
  'settings.logs.from': { defaultMessage: 'From' },
  'settings.logs.to': { defaultMessage: 'To' },
  'settings.logs.commaSeparated': {
    defaultMessage: 'Comma-separated values',
  },
  'settings.logs.all': { defaultMessage: 'All' },
  'settings.logs.applyFilters': { defaultMessage: 'Apply filters' },
  'settings.logs.loadError': { defaultMessage: 'Could not load event logs.' },
  'settings.logs.date': { defaultMessage: 'Date' },
  'settings.logs.event': { defaultMessage: 'Event' },
  'settings.logs.id': { defaultMessage: 'Event ID' },
  'settings.logs.message': { defaultMessage: 'Message' },
  'settings.logs.details': { defaultMessage: 'View details' },
  'settings.logs.empty': {
    defaultMessage: 'No events match the current filters.',
  },
  'settings.logs.page': {
    defaultMessage: 'Page {page}',
    params: { page: 'number' },
  },
  'settings.logs.previous': { defaultMessage: 'Previous' },
  'settings.logs.next': { defaultMessage: 'Next' },
  'settings.logs.actor': { defaultMessage: 'Actor' },
  'settings.logs.resource': { defaultMessage: 'Resource' },
  'settings.logs.data': { defaultMessage: 'Event data' },
  'settings.logs.cleanup': { defaultMessage: 'Clean up logs' },
  'settings.logs.cleanupTitle': { defaultMessage: 'Delete old logs' },
  'settings.logs.cleanupDescription': {
    defaultMessage:
      'Choose a cutoff date. All events older than this date will be permanently deleted.',
  },
  'settings.logs.cleanupBefore': { defaultMessage: 'Delete events older than' },
  'settings.logs.cleanupConfirmation': {
    defaultMessage: 'Events before {date} will be permanently deleted. This cannot be undone.',
    params: { date: 'string' },
  },
  'settings.logs.cleanupConfirm': { defaultMessage: 'Delete old logs' },
  'settings.logs.cleanupSuccess': {
    defaultMessage: '{count, plural, one {# event deleted} other {# events deleted}}.',
    params: { count: 'number' },
  },
  'settings.logs.cleanupError': { defaultMessage: 'Could not delete old logs.' },

  'common.cancel': { defaultMessage: 'Cancel' },
  'common.confirm': { defaultMessage: 'Confirm' },
  'common.edit': { defaultMessage: 'Edit' },
  'common.restore': { defaultMessage: 'Restore' },
  'common.duplicate': { defaultMessage: 'Duplicate' },
  'common.openMenu': { defaultMessage: 'Open menu' },
  'common.unknownUser': { defaultMessage: 'Unknown user' },
  'common.selectAll': { defaultMessage: 'Select all' },
  'common.selectRow': { defaultMessage: 'Select row' },
  'common.select': { defaultMessage: 'Select' },
  'common.deselect': { defaultMessage: 'Deselect' },
  'common.move': { defaultMessage: 'Move' },
  'common.upload': { defaultMessage: 'Upload' },
  'common.download': { defaultMessage: 'Download' },

  'mediaPicker.title': { defaultMessage: 'Media library' },
  'mediaPicker.description': {
    defaultMessage: 'Select existing media or upload new files.',
  },
  'mediaPicker.selectCount': {
    defaultMessage: 'Select {count}',
    params: { count: 'number' },
  },

  'media.currentFolder': { defaultMessage: 'Current folder:' },
  'media.baseFolder': { defaultMessage: 'Base folder' },
  'media.cropAndRotate': { defaultMessage: 'Crop and rotate' },
  'media.replaceImage': { defaultMessage: 'Replace image' },
  'media.replaceImageTitle': { defaultMessage: 'Replace this image?' },
  'media.replaceImageDescription': {
    defaultMessage:
      'Replace "{name}" with "{fileName}". Its title, alt text, folder and references across the site will be preserved.',
    params: { name: 'string', fileName: 'string' },
  },
  'media.replaceImageConfirm': { defaultMessage: 'Replace image' },
  'media.imageReplaced': { defaultMessage: 'Image replaced everywhere it is referenced' },
  'media.replaceImageError': {
    defaultMessage: 'Could not replace the image: {reason}',
    params: { reason: 'string' },
  },
  'media.replaceImageInvalidFile': {
    defaultMessage: 'Choose an image file to replace this image.',
  },
  'media.moveToFolder': { defaultMessage: 'Move to folder' },
  'media.createFolder': { defaultMessage: 'Create folder' },
  'media.createFolderDescription': {
    defaultMessage: 'Enter a name for the new folder.',
  },
  'media.folderNamePlaceholder': { defaultMessage: 'Folder name' },
  'media.dragDropFiles': { defaultMessage: 'Drag & drop files here' },
  'media.uploadLimits': {
    defaultMessage: 'Upload max 20 files each up to 5MB',
  },
  'media.emptyFolder': { defaultMessage: 'No files in this folder yet.' },
  'media.bulkDeleteTitle': { defaultMessage: 'Delete selected files' },
  'media.bulkDeleteDescription': {
    defaultMessage: 'This will delete {count} selected {count, plural, one {file} other {files}}.',
    params: { count: 'number' },
  },
  'media.noInlinePreview': {
    defaultMessage: 'This file type does not have inline preview.',
  },
  'media.openFile': { defaultMessage: 'Open file' },
  'media.downloadError': { defaultMessage: 'Could not download the file.' },
  'media.alt': { defaultMessage: 'Alt' },
  'media.mime': { defaultMessage: 'MIME' },
  'media.size': { defaultMessage: 'Size' },
  'media.originalSize': { defaultMessage: 'Original Size' },
  'media.dimensions': { defaultMessage: 'Dimensions' },
  'media.orientation': { defaultMessage: 'Orientation' },
  'media.optimization': { defaultMessage: 'Optimization' },
  'media.quality': { defaultMessage: 'Quality' },
  'media.previewVariant': { defaultMessage: 'Preview Variant' },
  'media.saved': { defaultMessage: 'Saved' },
  'media.responsiveSizes': { defaultMessage: 'Responsive sizes' },
  'media.na': { defaultMessage: 'N/A' },
  'media.yes': { defaultMessage: 'Yes' },
  'media.no': { defaultMessage: 'No' },
  'media.optimizedWithFormat': {
    defaultMessage: 'Yes ({format})',
    params: { format: 'string' },
  },
  'media.available': { defaultMessage: 'Available' },
  'media.preview': { defaultMessage: 'Preview' },
  'media.deleteFolderTitle': { defaultMessage: 'Delete folder' },
  'media.deleteFileTitle': { defaultMessage: 'Delete file' },
  'media.deleteFolderDescription': {
    defaultMessage: 'This will delete "{name}" and everything inside it.',
    params: { name: 'string' },
  },
  'media.deleteFileDescription': {
    defaultMessage: 'Are you sure you want to delete "{name}"?',
    params: { name: 'string' },
  },
  'media.deleteFolderConfirm': {
    defaultMessage:
      'I understand this will permanently delete the folder "{path}" and all of its files and subfolders.',
    params: { path: 'string' },
  },
  'media.editFolderTitle': { defaultMessage: 'Edit folder' },
  'media.editFileTitle': { defaultMessage: 'Edit file' },
  'media.editDescription': { defaultMessage: 'Update the name.' },
  'media.cropTitle': { defaultMessage: 'Crop and rotate image' },
  'media.cropDescription': {
    defaultMessage: 'Drag the crop area, resize from any edge, then save a copy.',
  },
  'media.loadingImage': { defaultMessage: 'Loading image...' },
  'media.imageLoadError': { defaultMessage: 'Image could not be loaded.' },
  'media.shape': { defaultMessage: 'Shape' },
  'media.rectangle': { defaultMessage: 'Rectangle' },
  'media.circle': { defaultMessage: 'Circle' },
  'media.rotation': { defaultMessage: 'Rotation' },
  'media.left': { defaultMessage: 'Left' },
  'media.right': { defaultMessage: 'Right' },
  'media.flip': { defaultMessage: 'Flip' },
  'media.horizontal': { defaultMessage: 'Horizontal' },
  'media.vertical': { defaultMessage: 'Vertical' },
  'media.cropArea': { defaultMessage: 'Crop area' },
  'media.cropInputPercent': {
    defaultMessage: '{label} %',
    params: { label: 'string' },
  },
  'media.saveCopy': { defaultMessage: 'Save copy' },
  'media.moveFileTitle': { defaultMessage: 'Move file' },
  'media.moveFilesTitle': { defaultMessage: 'Move files' },
  'media.moveBulkDescription': {
    defaultMessage:
      'Select the destination folder for {count} selected {count, plural, one {file} other {files}}.',
    params: { count: 'number' },
  },
  'media.moveSingleDescription': {
    defaultMessage: 'Select the destination folder for "{name}".',
    params: { name: 'string' },
  },
  'media.selectFolder': { defaultMessage: 'Select folder' },
  'media.fileCount': {
    defaultMessage: '{count, plural, one {# file} other {# files}}',
    params: { count: 'number' },
  },
  'media.enableOptimization': { defaultMessage: 'Enable optimization' },
  'media.optimizationEnforced': {
    defaultMessage: 'Optimization is enforced by this field configuration.',
  },
  'media.format': { defaultMessage: 'Format' },
  'media.selectFormat': { defaultMessage: 'Select format' },
  'media.outputFormat': { defaultMessage: 'Output format' },
  'media.outputFormats': { defaultMessage: 'Output formats' },
  'media.videoOutputFormats': { defaultMessage: 'MP4 + WebM' },
  'media.videoFormatsDescription': {
    defaultMessage: 'Videos are converted to both formats for broad browser compatibility.',
  },
  'media.qualityRange': { defaultMessage: 'Quality (1-100)' },
  'media.generatePreview': { defaultMessage: 'Generate preview' },
  'media.generateResponsiveSizes': {
    defaultMessage: 'Generate responsive sizes',
  },
  'media.uploading': { defaultMessage: 'Uploading...' },
  'media.filterImages': { defaultMessage: 'Images' },
  'media.filterVideos': { defaultMessage: 'Videos' },
  'media.filterDocs': { defaultMessage: 'Docs' },
  'media.typeSize': { defaultMessage: 'Type / Size' },
  'media.date': { defaultMessage: 'Date' },
  'media.listView': { defaultMessage: 'List view' },
  'media.smallGridView': { defaultMessage: 'Small grid view' },
  'media.largeGridView': { defaultMessage: 'Large grid view' },
  'media.folderDeleted': { defaultMessage: 'Folder deleted successfully' },
  'media.fileDeleted': { defaultMessage: 'File deleted successfully' },
  'media.folderUpdated': { defaultMessage: 'Folder updated successfully' },
  'media.fileUpdated': { defaultMessage: 'File updated successfully' },
  'media.filesMoved': {
    defaultMessage: '{count} {count, plural, one {file} other {files}} moved successfully',
    params: { count: 'number' },
  },
  'media.filesDeletedCount': {
    defaultMessage: '{count} {count, plural, one {file} other {files}} deleted successfully',
    params: { count: 'number' },
  },
  'media.filesFailed': {
    defaultMessage: '{count} {count, plural, one {file} other {files}} failed. {reason}',
    params: { count: 'number', reason: 'string' },
  },
  'media.openImageEditorError': {
    defaultMessage: 'Could not open image editor',
  },
  'media.editedImageSaved': { defaultMessage: 'Edited image saved' },
  'media.reimportWithOptimization': {
    defaultMessage: 'Reimport',
  },
  'media.enableOptimizationToReimport': {
    defaultMessage: 'Enable optimization to reimport',
  },
  'media.reimportTitle': { defaultMessage: 'Reimport media?' },
  'media.reimportDescription': {
    defaultMessage:
      'Reprocess {name} with the optimization settings currently selected in the media toolbar. Existing references and details will be preserved.',
  },
  'media.reimportConfirm': { defaultMessage: 'Reimport' },
  'media.reimported': { defaultMessage: 'Media reimported' },
  'media.reimportError': {
    defaultMessage: 'Could not reimport the media: {reason}',
  },
  'media.bulkReimportTitle': { defaultMessage: 'Reimport selected media?' },
  'media.bulkReimportDescription': {
    defaultMessage:
      'Reprocess {count} selected media items with the optimization settings currently selected in the media toolbar. Existing references and details will be preserved.',
    params: { count: 'number' },
  },
  'media.bulkReimported': {
    defaultMessage: 'Reimported {count} media {count, plural, one {item} other {items}}',
    params: { count: 'number' },
  },
  'media.bulkReimportNoImages': {
    defaultMessage: 'Select at least one image to reimport',
  },
  'media.bulkReimportNoMedia': {
    defaultMessage: 'Select at least one image or video to reimport',
  },
  'media.reimportSelectedCount': {
    defaultMessage: 'Reimport',
    params: { count: 'number' },
  },
  'media.saveEditedImageError': {
    defaultMessage: 'Could not save edited image',
  },
  'media.imageDetailsSaved': { defaultMessage: 'Image details saved' },
  'media.saveImageDetailsError': {
    defaultMessage: 'Could not save image details',
  },
  'media.folderCreated': { defaultMessage: 'Folder created' },
  'media.createFolderError': { defaultMessage: 'Could not create folder' },
  'media.uploadFailed': { defaultMessage: 'Upload failed' },
  'media.uploadUnexpectedError': {
    defaultMessage: 'An unexpected error occurred during upload. Please try again.',
  },
  'media.fileRejected': {
    defaultMessage: '"{name}" has been rejected',
    params: { name: 'string' },
  },
  'media.searchFolders': { defaultMessage: 'Search folders...' },
  'media.searchFiles': { defaultMessage: 'Search files by name...' },
  'media.noSearchResults': { defaultMessage: 'No files match your search.' },
  'common.save': { defaultMessage: 'Save' },
  'common.close': { defaultMessage: 'Close' },
  'common.delete': { defaultMessage: 'Delete' },
  'common.retry': { defaultMessage: 'Retry' },
  'common.send': { defaultMessage: 'Send' },
  'common.clear': { defaultMessage: 'Clear' },
  'common.done': { defaultMessage: 'Done' },
  'common.add': { defaultMessage: 'Add' },
  'common.create': { defaultMessage: 'Create' },
  'common.error': { defaultMessage: 'Error' },
  'common.loading': { defaultMessage: 'Loading...' },
  'common.required': { defaultMessage: 'required' },
  'common.all': { defaultMessage: 'All' },
  'common.toggle': { defaultMessage: 'Toggle' },
  'common.options': { defaultMessage: 'Options' },
  'common.item': { defaultMessage: 'Item' },
  'common.items': { defaultMessage: 'Items' },
  'common.field': { defaultMessage: 'Field' },
  'common.by': { defaultMessage: 'by' },
  'common.configure': { defaultMessage: 'Configure' },
  'common.new': { defaultMessage: 'New' },
  'common.existing': { defaultMessage: 'Existing' },
  'common.global': { defaultMessage: 'Global' },
  'common.empty': { defaultMessage: 'Empty' },
  'common.removed': { defaultMessage: 'Removed' },
  'common.added': { defaultMessage: 'Added' },
  'common.source': { defaultMessage: 'Source' },
  'common.limit': { defaultMessage: 'Limit' },
  'common.direction': { defaultMessage: 'Direction' },
  'common.preview': { defaultMessage: 'Preview' },
  'common.contentTypeNotFound': { defaultMessage: 'Content type not found.' },
  'common.addToFavorites': { defaultMessage: 'Add to favorites' },
  'common.removeFromFavorites': { defaultMessage: 'Remove from favorites' },
  'common.addedToFavorites': { defaultMessage: 'Added to favorites' },
  'common.couldNotUpdateFavorite': {
    defaultMessage: 'Could not update favorite',
  },

  'fields.title': { defaultMessage: 'Title' },
  'fields.slug': { defaultMessage: 'Slug' },
  'fields.name': { defaultMessage: 'Name' },
  'fields.description': { defaultMessage: 'Description' },
  'fields.body': { defaultMessage: 'Body' },
  'fields.excerpt': { defaultMessage: 'Excerpt' },
  'fields.status': { defaultMessage: 'Status' },
  'fields.priority': { defaultMessage: 'Priority' },
  'fields.intent': { defaultMessage: 'Intent' },
  'fields.priorityNotes': { defaultMessage: 'Priority notes' },

  'dataTable.noResults': { defaultMessage: 'No results.' },
  'dataTable.resizeColumn': { defaultMessage: 'Resize column' },

  'visibility.draft': { defaultMessage: 'Draft' },
  'visibility.hidden': { defaultMessage: 'Hidden' },
  'visibility.published': { defaultMessage: 'Published' },
  'visibility.trash': { defaultMessage: 'Trash' },

  'contentList.active': { defaultMessage: 'Active' },
  'contentList.trash': { defaultMessage: 'Trash' },
  'contentList.search': { defaultMessage: 'Search...' },
  'contentList.create': { defaultMessage: 'Create' },
  'contentList.id': { defaultMessage: 'ID' },
  'contentList.status': { defaultMessage: 'Status' },
  'contentList.createdBy': { defaultMessage: 'Created by' },
  'contentList.variants': { defaultMessage: 'Variants' },
  'contentList.filterByCreator': { defaultMessage: 'Filter by creator' },
  'contentList.searchPeople': { defaultMessage: 'Search people...' },
  'contentList.noPeopleFound': { defaultMessage: 'No people found.' },
  'contentList.clearFilter': { defaultMessage: 'Clear filter' },
  'contentList.moveToTrash': { defaultMessage: 'Move to trash' },
  'contentList.deletePermanently': { defaultMessage: 'Delete permanently' },
  'contentList.duplicating': { defaultMessage: 'Duplicating...' },
  'contentList.itemDuplicated': { defaultMessage: 'Item duplicated' },
  'contentList.itemRestored': { defaultMessage: 'Item restored' },
  'contentList.selectedCount': {
    defaultMessage: '{count} selected',
    params: { count: 'number' },
  },
  'contentList.translate': { defaultMessage: 'Translate' },
  'contentList.translateSelectedTitle': {
    defaultMessage: 'Translate selected items',
  },
  'contentList.translateSelectedDescription': {
    defaultMessage:
      'Translate supported fields for {count} selected {count, plural, one {item} other {items}}.',
    params: { count: 'number' },
  },
  'contentList.sourceLanguage': { defaultMessage: 'Source language' },
  'contentList.targetLanguages': { defaultMessage: 'Target languages' },
  'contentList.selectSource': { defaultMessage: 'Select source' },
  'contentList.overwriteTranslations': {
    defaultMessage: 'Overwrite existing translations',
  },
  'contentList.deleteSelectedTitle': {
    defaultMessage: 'Delete selected permanently',
  },
  'contentList.moveSelectedTitle': {
    defaultMessage: 'Move selected to trash',
  },
  'contentList.deleteSelectedDescription': {
    defaultMessage:
      'This will permanently delete {count} selected {count, plural, one {item} other {items}}. This cannot be undone.',
    params: { count: 'number' },
  },
  'contentList.moveSelectedDescription': {
    defaultMessage:
      'This will move {count} selected {count, plural, one {item} other {items}} to trash.',
    params: { count: 'number' },
  },
  'contentList.restoreSelected': {
    defaultMessage: 'Restore selected item?',
  },
  'contentList.bulkMoved': {
    defaultMessage: '{count} {count, plural, one {item} other {items}} moved to trash',
    params: { count: 'number' },
  },
  'contentList.bulkDeleted': {
    defaultMessage: '{count} {count, plural, one {item} other {items}} deleted permanently',
    params: { count: 'number' },
  },
  'contentList.bulkTranslated': {
    defaultMessage:
      '{count} {count, plural, one {item} other {items}} translated ({segments} {segments, plural, one {segment} other {segments}})',
    params: { count: 'number', segments: 'number' },
  },
  'contentList.bulkFailed': {
    defaultMessage: '{count} {count, plural, one {item} other {items}} failed. {reason}',
    params: { count: 'number', reason: 'string' },
  },
  'contentList.selectTargetLanguage': {
    defaultMessage: 'Select at least one target language',
  },

  'pagination.previous': { defaultMessage: 'Previous' },
  'pagination.next': { defaultMessage: 'Next' },
  'pagination.itemsPerPage': { defaultMessage: 'Items per page' },
  'pagination.rows': { defaultMessage: 'Rows' },
  'pagination.goToPage': { defaultMessage: 'Go to page:' },
  'pagination.morePages': { defaultMessage: 'More pages' },
  'pagination.range': {
    defaultMessage: '{first}-{last} of {total}',
    params: { first: 'number', last: 'number', total: 'number' },
  },
  'pagination.goToPrevious': { defaultMessage: 'Go to previous page' },
  'pagination.goToNext': { defaultMessage: 'Go to next page' },

  'contentEdit.tabInfo': { defaultMessage: 'Info' },
  'contentEdit.tabContent': { defaultMessage: 'Content' },
  'contentEdit.tabTemplate': { defaultMessage: 'Template' },
  'contentEdit.tabSeo': { defaultMessage: 'Seo' },
  'contentEdit.tabVariants': { defaultMessage: 'Variants' },
  'contentEdit.tabHistory': { defaultMessage: 'History' },
  'contentEdit.viewPage': { defaultMessage: 'View page' },
  'contentEdit.templateContent': { defaultMessage: 'Content' },
  'contentEdit.templateContentDescription': {
    defaultMessage: 'Renders the modules from this document’s Content tab here.',
  },
  'structuredData.moduleTitle': { defaultMessage: 'Structured data (JSON-LD)' },
  'structuredData.moduleDescription': {
    defaultMessage:
      'Adds non-visual schema.org data. Use Dynamic Data and templates to reuse it across documents.',
  },
  'structuredData.moduleCategory': { defaultMessage: 'SEO' },
  'structuredData.customJsonDescription': {
    defaultMessage:
      'Advanced JSON-LD object or array. Invalid JSON is omitted from search output and reported by SEO analysis.',
  },
  'structuredData.schemaTypeHelp': {
    defaultMessage:
      'Choose the schema that describes the main entity on this page.\n\nProduct: a purchasable product, including offer and rating data.\nArticle: editorial content, news, guides, or blog posts.\nOrganization: the company or organization behind the site.\nWebSite: the website itself; this normally belongs in a global template.\nBreadcrumbList: the page hierarchy shown as breadcrumbs.\nCustom: an advanced schema.org object or graph not covered by the typed forms.',
  },
  'contentEdit.couldNotSaveTemplate': {
    defaultMessage: 'Could not save the shared template',
  },
  'contentEdit.sharedTemplateWarning': {
    defaultMessage: 'This template is shared. Changes made here apply to all content of this type.',
  },
  'contentEdit.saveAsDraft': { defaultMessage: 'Save copy as draft' },
  'contentEdit.saveAsVariant': { defaultMessage: 'Save copy as variant' },
  'contentEdit.saveOptions': { defaultMessage: 'Save options' },
  'contentEdit.discardChanges': { defaultMessage: 'Discard changes' },
  'contentEdit.discardChangesTitle': {
    defaultMessage: 'Discard unsaved changes?',
  },
  'contentEdit.discardChangesDescription': {
    defaultMessage:
      'This restores the last saved version of this item. Shared unsaved edits from every editor will be lost.',
  },
  'contentEdit.discardChangesWithTemplateDescription': {
    defaultMessage:
      'This restores the last saved version of this item and its shared template. Shared unsaved edits from every editor will be lost.',
  },
  'contentEdit.moreActions': { defaultMessage: 'More actions' },
  'contentEdit.fixHasErrors': {
    defaultMessage: 'There are errors to fix',
  },
  'contentEdit.restoreFromTrash': { defaultMessage: 'Restore from trash' },
  'contentEdit.closePreview': { defaultMessage: 'Close preview' },
  'contentEdit.moveItemToTrash': { defaultMessage: 'Move item to trash' },
  'contentEdit.deleteItemPermanently': {
    defaultMessage: 'Delete item permanently',
  },
  'contentEdit.moveToTrashDescription': {
    defaultMessage:
      'This item will be hidden from lists and public routes. You can restore it from the trash.',
  },
  'contentEdit.moveToTrashGroupDescription': {
    defaultMessage:
      'This moves the primary page and every variant in this group to trash. The whole page group will be hidden from lists and public routes, and can be restored together from trash.',
  },
  'contentEdit.deletePermanentlyDescription': {
    defaultMessage: 'This item will be permanently deleted. This cannot be undone.',
  },
  'contentEdit.deleteConfirmDescription': {
    defaultMessage: 'Are you sure you want to permanently delete this item? This cannot be undone.',
  },
  'contentEdit.trashConfirmDescription': {
    defaultMessage:
      'Are you sure you want to move this item to trash? It will be hidden from lists and public routes until restored.',
  },
  'contentEdit.translateDocument': { defaultMessage: 'Translate document' },
  'contentEdit.translateDocumentDescription': {
    defaultMessage: 'Translate supported fields in the shared working document.',
  },
  'contentEdit.collaboration.connecting': { defaultMessage: 'Connecting' },
  'contentEdit.collaboration.synced': { defaultMessage: 'Shared changes saved' },
  'contentEdit.collaboration.unsaved': { defaultMessage: 'Shared unsaved changes' },
  'contentEdit.collaboration.offline': {
    defaultMessage: 'Offline · changes stored locally',
  },
  'contentEdit.collaboration.error': { defaultMessage: 'Sync interrupted' },
  'contentEdit.presence.viewers': {
    defaultMessage: '{count, plural, one {# person viewing} other {# people viewing}}',
    params: { count: 'number' },
  },
  'contentEdit.presence.thisTab': { defaultMessage: '(this tab)' },
  'contentEdit.presence.more': {
    defaultMessage: '+{count}',
    params: { count: 'number' },
  },
  'contentEdit.presence.viewing': { defaultMessage: 'Viewing this document' },
  'contentEdit.presence.editingField': {
    defaultMessage: 'Editing {field}',
    params: { field: 'string' },
  },
  'contentEdit.collaborationUnavailable': {
    defaultMessage: 'The collaborative document could not be loaded.',
  },
  'contentEdit.requiredField': { defaultMessage: 'Required field' },
  'contentEdit.fieldHelp': { defaultMessage: 'Field help' },
  'contentEdit.translatableField': { defaultMessage: 'Translatable field' },
  'contentEdit.fallbackValue': { defaultMessage: 'Fallback value' },
  'contentEdit.fixFixErrors': {
    defaultMessage: 'Please fix the errors above',
  },
  'contentEdit.createdSuccessfully': { defaultMessage: 'Created successfully' },
  'contentEdit.updatedSuccessfully': { defaultMessage: 'Updated successfully' },
  'contentEdit.translatedSuccessfully': {
    defaultMessage: 'Translated successfully',
  },
  'contentEdit.draftCopyCreated': { defaultMessage: 'Draft copy created' },
  'contentEdit.changesDiscarded': { defaultMessage: 'Changes discarded' },
  'contentEdit.restoredFromTrash': { defaultMessage: 'Restored from trash' },
  'contentEdit.movedToTrash': { defaultMessage: 'Moved to trash' },
  'contentEdit.deletedPermanently': { defaultMessage: 'Deleted permanently' },
  'contentEdit.publishedIn': {
    defaultMessage: 'Published in {language}',
    params: { language: 'string' },
  },
  'contentEdit.draftVariantCreatedForReview': {
    defaultMessage: 'Draft variant created for review',
  },
  'contentEdit.publishedApprovedDraft': {
    defaultMessage: 'Published approved draft',
  },
  'contentEdit.couldNotSaveDocument': {
    defaultMessage: 'Could not save document',
  },
  'contentEdit.couldNotCreateDraftCopy': {
    defaultMessage: 'Could not create draft copy',
  },
  'contentEdit.couldNotDiscardChanges': {
    defaultMessage: 'Could not discard changes',
  },
  'contentEdit.couldNotMoveToTrash': {
    defaultMessage: 'Could not move item to trash',
  },
  'contentEdit.couldNotDeleteItem': {
    defaultMessage: 'Could not delete item',
  },
  'contentEdit.couldNotPublishPage': {
    defaultMessage: 'Could not publish page',
  },
  'contentEdit.couldNotCreateDraftVariant': {
    defaultMessage: 'Could not create draft variant',
  },
  'contentEdit.layoutOverrideUpdated': {
    defaultMessage: 'Layout override updated successfully',
  },
  'contentEdit.defaultFromRoute': { defaultMessage: 'Default from route:' },
  'contentEdit.overrideOnlyForEntry': {
    defaultMessage: '. Override only for this entry.',
  },
  'contentEdit.useRouteDefault': { defaultMessage: 'Use route default' },
  'contentEdit.noModule': { defaultMessage: 'No module' },
  'contentEdit.saveOverride': { defaultMessage: 'Save override' },
  'contentEdit.editSelectedModule': { defaultMessage: 'Edit selected module' },
  'contentEdit.updating': { defaultMessage: 'Updating' },
  'contentEdit.updatePreview': { defaultMessage: 'Update preview' },
  'contentEdit.selectModule': { defaultMessage: 'Select module' },
  'contentEdit.openLargePreview': { defaultMessage: 'Open large preview' },
  'contentEdit.closeLargePreview': { defaultMessage: 'Close large preview' },
  'contentEdit.loadingPreview': { defaultMessage: 'Loading preview' },
  'contentEdit.previewCouldNotLoad': {
    defaultMessage: 'Preview could not be loaded',
  },
  'contentEdit.seoMetadataView': { defaultMessage: 'Metadata' },
  'contentEdit.seoAnalysisView': { defaultMessage: 'Analysis' },
  'contentEdit.seoAnalysisTitle': { defaultMessage: 'On-page SEO report' },
  'contentEdit.seoAnalysisDescription': {
    defaultMessage: 'Analyze the rendered preview with the latest unsaved changes.',
  },
  'contentEdit.seoGenerateReport': { defaultMessage: 'Generate report' },
  'contentEdit.seoRegenerateReport': { defaultMessage: 'Regenerate report' },
  'contentEdit.seoAnalysisUnavailable': {
    defaultMessage: 'Configure preview for this route to enable SEO analysis.',
  },
  'contentEdit.seoAnalysisError': {
    defaultMessage: 'The SEO report could not be generated.',
  },
  'contentEdit.seoAnalysisPreviewError': {
    defaultMessage: 'The preview snapshot for the SEO report could not be created.',
  },
  'contentEdit.seoAnalysisTimeout': {
    defaultMessage:
      'The rendered preview did not answer in time. Check that the web preview uses a compatible Rakun adapter and can load without browser errors.',
  },
  'contentEdit.seoAnalysisInvalidResponse': {
    defaultMessage: 'The rendered preview returned an invalid SEO report.',
  },
  'contentEdit.seoAnalysisFrameTitle': { defaultMessage: 'SEO analysis preview' },
  'contentEdit.seoNoReportTitle': { defaultMessage: 'No report generated yet' },
  'contentEdit.seoNoReportDescription': {
    defaultMessage:
      'Generate a report to inspect metadata, headings, images and search and social previews.',
  },
  'contentEdit.seoScoreTitle': { defaultMessage: 'SEO health score' },
  'contentEdit.seoScoreDescription': {
    defaultMessage: 'A practical guide based on the rendered page, not a search ranking guarantee.',
  },
  'contentEdit.seoStatusGood': { defaultMessage: 'Good' },
  'contentEdit.seoStatusWarning': { defaultMessage: 'Improve' },
  'contentEdit.seoStatusError': { defaultMessage: 'Problem' },
  'contentEdit.seoCheckTitle': { defaultMessage: 'Page title' },
  'contentEdit.seoTitleMissing': { defaultMessage: 'The rendered page has no title.' },
  'contentEdit.seoTitleGood': {
    defaultMessage: 'The title length is suitable ({count} characters).',
    params: { count: 'number' },
  },
  'contentEdit.seoTitleImprove': {
    defaultMessage: 'The title has {count} characters; aim for 30–60.',
    params: { count: 'number' },
  },
  'contentEdit.seoCheckDescription': { defaultMessage: 'Meta description' },
  'contentEdit.seoDescriptionMissing': {
    defaultMessage: 'The rendered page has no meta description.',
  },
  'contentEdit.seoDescriptionGood': {
    defaultMessage: 'The description length is suitable ({count} characters).',
    params: { count: 'number' },
  },
  'contentEdit.seoDescriptionImprove': {
    defaultMessage: 'The description has {count} characters; aim for 120–160.',
    params: { count: 'number' },
  },
  'contentEdit.seoCheckH1': { defaultMessage: 'Primary heading' },
  'contentEdit.seoH1Good': { defaultMessage: 'The page has exactly one H1.' },
  'contentEdit.seoH1Missing': { defaultMessage: 'The page has no H1.' },
  'contentEdit.seoH1Multiple': {
    defaultMessage: 'The page has {count} H1 headings; use one clear primary heading.',
    params: { count: 'number' },
  },
  'contentEdit.seoCheckHeadings': { defaultMessage: 'Heading hierarchy' },
  'contentEdit.seoHeadingsGood': { defaultMessage: 'Heading levels follow a logical order.' },
  'contentEdit.seoHeadingsMissing': { defaultMessage: 'The page has no headings.' },
  'contentEdit.seoHeadingsSkipped': {
    defaultMessage:
      '{count, plural, one {One heading skips a level} other {# headings skip a level}}.',
    params: { count: 'number' },
  },
  'contentEdit.seoCheckImages': { defaultMessage: 'Image alt text' },
  'contentEdit.seoImagesGood': {
    defaultMessage:
      '{count, plural, =0 {The page has no images} one {The image has an alt attribute} other {All # images have alt attributes}}.',
    params: { count: 'number' },
  },
  'contentEdit.seoImagesMissingAlt': {
    defaultMessage:
      '{count, plural, one {One image has no alt attribute} other {# images have no alt attribute}}.',
    params: { count: 'number' },
  },
  'contentEdit.seoCheckCanonical': { defaultMessage: 'Canonical URL' },
  'contentEdit.seoCanonicalGood': { defaultMessage: 'The page declares a canonical URL.' },
  'contentEdit.seoCanonicalMissing': { defaultMessage: 'The page has no canonical URL.' },
  'contentEdit.seoCanonicalSiteUrlMissing': {
    defaultMessage:
      'The canonical URL cannot be generated until Site URL is configured in Settings → SEO.',
  },
  'contentEdit.seoCheckLanguage': { defaultMessage: 'Document language' },
  'contentEdit.seoLanguageGood': {
    defaultMessage: 'The document language is set to {language}.',
    params: { language: 'string' },
  },
  'contentEdit.seoLanguageMissing': {
    defaultMessage: 'The HTML document has no language attribute.',
  },
  'contentEdit.seoCheckIndexing': { defaultMessage: 'Indexing' },
  'contentEdit.seoIndexingGood': { defaultMessage: 'The page does not declare noindex.' },
  'contentEdit.seoIndexingBlocked': { defaultMessage: 'The page declares noindex.' },
  'contentEdit.seoCheckSocial': { defaultMessage: 'Social metadata' },
  'contentEdit.seoSocialGood': {
    defaultMessage: 'Open Graph title, description and image are present.',
  },
  'contentEdit.seoSocialMissing': {
    defaultMessage: 'Missing Open Graph fields: {fields}.',
    params: { fields: 'string' },
  },
  'contentEdit.seoSocialFieldTitle': { defaultMessage: 'title' },
  'contentEdit.seoSocialFieldDescription': { defaultMessage: 'description' },
  'contentEdit.seoSocialFieldImage': { defaultMessage: 'image' },
  'contentEdit.seoCheckStructuredData': { defaultMessage: 'Structured data' },
  'contentEdit.seoStructuredDataTitle': { defaultMessage: 'JSON-LD schemas' },
  'contentEdit.seoStructuredDataNone': {
    defaultMessage: 'No JSON-LD structured data was found on this page.',
  },
  'contentEdit.seoStructuredDataGood': {
    defaultMessage:
      '{count, plural, one {One valid JSON-LD block was found} other {# valid JSON-LD blocks were found}}.',
    params: { count: 'number' },
  },
  'contentEdit.seoStructuredDataInvalid': {
    defaultMessage:
      '{count, plural, one {One JSON-LD block needs attention} other {# JSON-LD blocks need attention}}.',
    params: { count: 'number' },
  },
  'contentEdit.seoStructuredDataCount': {
    defaultMessage:
      '{count, plural, =0 {No blocks found} one {# block found} other {# blocks found}}.',
    params: { count: 'number' },
  },
  'contentEdit.seoStructuredDataValid': { defaultMessage: 'Valid' },
  'contentEdit.seoStructuredDataNeedsAttention': { defaultMessage: 'Needs attention' },
  'contentEdit.seoStructuredDataInvalidJson': { defaultMessage: 'The JSON is not valid.' },
  'contentEdit.seoStructuredDataMissingContext': {
    defaultMessage: 'The @context property is missing.',
  },
  'contentEdit.seoStructuredDataMissingType': {
    defaultMessage: 'No @type property was found.',
  },
  'contentEdit.seoStructuredDataViewJson': { defaultMessage: 'View resolved JSON-LD' },
  'contentEdit.seoGooglePreview': { defaultMessage: 'Google preview' },
  'contentEdit.seoSocialPreview': { defaultMessage: 'Sharing preview' },
  'contentEdit.seoHeadingOutline': { defaultMessage: 'Heading outline' },
  'contentEdit.seoHeadingLevel': {
    defaultMessage: 'H{level}',
    params: { level: 'number' },
  },
  'contentEdit.seoHeadingCount': {
    defaultMessage: '{count, plural, one {# heading found} other {# headings found}}.',
    params: { count: 'number' },
  },
  'contentEdit.seoEmptyHeading': { defaultMessage: 'Empty heading' },
  'contentEdit.versionRestored': {
    defaultMessage: 'Version restored successfully',
  },
  'contentEdit.noVisibleModuleChanges': {
    defaultMessage: 'No visible module changes.',
  },
  'contentEdit.noVersionsYet': { defaultMessage: 'No versions recorded yet.' },
  'contentEdit.revision': { defaultMessage: 'Revision' },
  'contentEdit.fieldCount': {
    defaultMessage: '{count} {count, plural, one {field} other {fields}}',
    params: { count: 'number' },
  },
  'contentEdit.noContentFieldsChanged': {
    defaultMessage: 'No content fields changed.',
  },
  'contentEdit.localStructure': { defaultMessage: 'Local structure' },
  'contentEdit.sharedStructure': { defaultMessage: 'Shared structure' },
  'contentEdit.useSharedStructure': { defaultMessage: 'Use shared structure' },
  'contentEdit.unlinkThisEntry': { defaultMessage: 'Unlink this entry' },
  'contentEdit.keepThisEntryLocal': { defaultMessage: 'Keep this entry local' },
  'contentEdit.useThisStructure': { defaultMessage: 'Use this structure' },
  'contentEdit.sharedStructureNotConfigured': {
    defaultMessage: 'Shared structure not configured',
  },
  'contentEdit.localStructureDescription': {
    defaultMessage: 'Changes only affect this entry.',
  },
  'contentEdit.localStructureUnconfiguredDescription': {
    defaultMessage:
      'Changes only affect this entry. The shared structure has not been configured yet.',
  },
  'contentEdit.chooseSharedStructureDescription': {
    defaultMessage: 'Choose this iterator as the initial structure for every linked entry.',
  },
  'contentEdit.useThisAsSharedTitle': {
    defaultMessage: 'Use this as the shared structure?',
  },
  'contentEdit.useSharedTitle': {
    defaultMessage: 'Use the shared structure?',
  },
  'contentEdit.useThisAsSharedDescription': {
    defaultMessage:
      'This iterator will become the structure for every linked entry. Local entries will not be changed.',
  },
  'contentEdit.useSharedDescription': {
    defaultMessage:
      "This entry's local iterator will be discarded when you save. The shared structure itself will not be changed.",
  },
  'contentEdit.updateAnyRequired': {
    defaultMessage: 'The update-any permission is required to initialize it.',
  },
  'contentEdit.firstEntryInitializes': {
    defaultMessage: 'Saving initializes it automatically only when this is the first entry.',
  },
  'contentEdit.iteratorChangesApply': {
    defaultMessage: 'Iterator changes apply to every linked {contentType}.',
    params: { contentType: 'string' },
  },
  'contentEdit.sharedIteratorReadOnly': {
    defaultMessage: 'This shared iterator is read-only with your current permissions.',
  },
  'contentEdit.stopSelectingModules': {
    defaultMessage: 'Stop selecting modules',
  },
  'contentEdit.route': { defaultMessage: 'Route' },
  'contentEdit.routes': { defaultMessage: 'Routes' },
  'linkPicker.placeholder': {
    defaultMessage: 'Paste a URL or choose a destination',
  },
  'linkPicker.title': { defaultMessage: 'Title' },
  'linkPicker.titlePlaceholder': { defaultMessage: 'Link title' },
  'linkPicker.destination': { defaultMessage: 'Destination' },
  'linkPicker.destinationRequired': { defaultMessage: 'Choose a destination.' },
  'linkPicker.chooseDestination': { defaultMessage: 'Choose a destination' },
  'linkPicker.directHint': {
    defaultMessage: 'You can also type a web address directly in the field.',
  },
  'linkPicker.homepage': { defaultMessage: 'Home page' },
  'linkPicker.routeTypes': { defaultMessage: 'Page types' },
  'linkPicker.noRoutes': { defaultMessage: 'No page routes are configured.' },
  'linkPicker.search': { defaultMessage: 'Search items...' },
  'linkPicker.noResults': { defaultMessage: 'No matching items.' },
  'linkPicker.back': { defaultMessage: 'Back to destinations' },
  'linkPicker.clear': { defaultMessage: 'Clear link' },
  'linkPicker.selected': { defaultMessage: 'Selected internal link' },
  'linkPicker.loadError': {
    defaultMessage: 'Could not load link destinations.',
  },
  'linkPicker.routeRequired': { defaultMessage: 'Choose a page type.' },
  'linkPicker.itemRequired': { defaultMessage: 'Choose an item.' },
  'linkPicker.publishedRequired': {
    defaultMessage: 'Only published pages are included in AI content.',
  },
  'menuField.addItem': { defaultMessage: 'Add menu item' },
  'menuField.empty': { defaultMessage: 'Add the first item to build this menu.' },
  'menuField.instructions': {
    defaultMessage: 'Drag vertically to reorder and horizontally to change nesting.',
  },
  'menuField.dragItem': { defaultMessage: 'Drag menu item' },
  'menuField.indentItem': { defaultMessage: 'Nest under previous item' },
  'menuField.outdentItem': { defaultMessage: 'Move up one level' },
  'menuField.removeItem': { defaultMessage: 'Remove item and its children' },
  'menuField.untitledItem': { defaultMessage: 'Untitled menu item' },
  'menuField.destinationRequired': {
    defaultMessage: 'Every menu item must have a destination.',
  },
  'contentEdit.addExisting': { defaultMessage: 'Add existing' },
  'contentEdit.addNew': { defaultMessage: 'Add new' },
  'contentEdit.createQuoted': {
    defaultMessage: 'Create "{query}"',
    params: { query: 'string' },
  },
  'contentEdit.invalidNumber': { defaultMessage: 'Invalid number' },
  'contentEdit.itemsCount': {
    defaultMessage: '{count} items',
    params: { count: 'number' },
  },
  'contentEdit.minimumItems': {
    defaultMessage: 'Minimum {count}',
    params: { count: 'number' },
  },
  'contentEdit.maximumItems': {
    defaultMessage: 'Maximum {count}',
    params: { count: 'number' },
  },
  'contentEdit.minimumItemsError': {
    defaultMessage: 'Add at least {count} items',
    params: { count: 'number' },
  },
  'contentEdit.maximumItemsError': {
    defaultMessage: 'Add no more than {count} items',
    params: { count: 'number' },
  },
  'contentEdit.selectAnOption': { defaultMessage: 'Select an option' },
  'contentEdit.reorderMedia': { defaultMessage: 'Reorder media' },
  'contentEdit.reorderItem': { defaultMessage: 'Reorder item' },
  'contentEdit.removeMedia': { defaultMessage: 'Remove media' },
  'contentEdit.mediaSelected': {
    defaultMessage: '{count} media selected',
    params: { count: 'number' },
  },
  'contentEdit.showingFirst': {
    defaultMessage: 'Showing the first {count}',
    params: { count: 'number' },
  },
  'contentEdit.manageAndReorder': { defaultMessage: 'Manage & reorder' },
  'contentEdit.manageSelectedMedia': { defaultMessage: 'Manage selected media' },
  'contentEdit.manageSelectedMediaDescription': {
    defaultMessage: 'Drag the files to reorder them or remove files from the selection.',
  },
  'contentEdit.invalidMediaFiles': {
    defaultMessage: 'Selected files are not valid {mediaType} media',
    params: { mediaType: 'string' },
  },
  'contentEdit.invalidMediaFile': {
    defaultMessage: 'Selected file is not a valid {mediaType} media type',
    params: { mediaType: 'string' },
  },

  'richText.insertImage': { defaultMessage: 'Insert image from media library' },
  'richText.insertImageError': {
    defaultMessage: 'Could not insert image from media library',
  },

  'variants.nameThisVariant': { defaultMessage: 'Name this variant' },
  'variants.nameDescription': {
    defaultMessage:
      'Give it a short identifying name. This is separate from the content title and will be used in the variants list.',
  },
  'variants.variantName': { defaultMessage: 'Variant name' },
  'variants.namePlaceholder': {
    defaultMessage: 'For example, Homepage redesign',
  },
  'variants.createVariant': { defaultMessage: 'Create variant' },
  'variants.noLocalesFound': { defaultMessage: 'No locales found.' },
  'variants.currentlyActive': { defaultMessage: 'currently active' },
  'variants.availableForRouteable': {
    defaultMessage: 'Variants are available for routeable content.',
  },
  'variants.moveToTrashTitle': { defaultMessage: 'Move variant to trash?' },
  'variants.moveToTrashConfirm': {
    defaultMessage:
      '“{label}” will be removed from this page group and its locale assignments will be cleared. The other variants will not be affected.',
    params: { label: 'string' },
  },
  'variants.moveVariantToTrash': { defaultMessage: 'Move variant to trash' },
  'variants.moveNamedToTrash': {
    defaultMessage: 'Move {label} to trash',
    params: { label: 'string' },
  },
  'variants.promote': { defaultMessage: 'Promote' },
  'variants.moveLocale': { defaultMessage: 'Move locale' },
  'variants.reviewRequired': { defaultMessage: 'Review required' },
  'variants.deletePermanentlyTitle': {
    defaultMessage: 'Delete variant permanently?',
  },
  'variants.deletePermanentlyConfirm': {
    defaultMessage: '“{label}” will be permanently deleted. This action cannot be undone.',
    params: { label: 'string' },
  },
  'variants.createDraftVariant': { defaultMessage: 'Create draft variant' },
  'variants.hideTrashed': { defaultMessage: 'Hide trashed' },
  'variants.showTrashed': {
    defaultMessage: 'Show trashed ({count})',
    params: { count: 'number' },
  },
  'variants.current': { defaultMessage: 'current' },
  'variants.setAsPrimary': { defaultMessage: 'Set as primary' },
  'variants.inTrashHint': {
    defaultMessage:
      'This variant is in trash. Restore it before editing or assigning locales. Previous locale assignments were cleared when it was moved to trash.',
  },
  'variants.noLocaleAssignments': {
    defaultMessage: 'No locale assignments.',
  },
  'variants.selectAllActiveLocales': {
    defaultMessage: 'Select all active locales',
  },
  'variants.newPagePublishIn': {
    defaultMessage: 'This is a new page. It will be published in {language}.',
    params: { language: 'string' },
  },
  'variants.selectLocales': { defaultMessage: 'Select locales...' },
  'variants.searchLocale': { defaultMessage: 'Search locale...' },
  'variants.draftVariantCreated': { defaultMessage: 'Draft variant created' },
  'variants.pagePublished': { defaultMessage: 'Page published' },
  'variants.variantPromoted': { defaultMessage: 'Variant promoted' },
  'variants.localeMoved': { defaultMessage: 'Locale moved' },
  'variants.localeUnassigned': { defaultMessage: 'Locale unassigned' },
  'variants.primaryUpdated': { defaultMessage: 'Primary variant updated' },
  'variants.movedToTrash': { defaultMessage: 'Variant moved to trash' },
  'variants.restored': {
    defaultMessage: 'Variant restored. Assign its locales when ready.',
  },
  'variants.permanentlyDeleted': {
    defaultMessage: 'Variant permanently deleted',
  },
  'variants.couldNotCreate': {
    defaultMessage: 'Could not create draft variant',
  },
  'variants.couldNotMoveLocale': { defaultMessage: 'Could not move locale' },
  'variants.couldNotUnassignLocale': {
    defaultMessage: 'Could not unassign locale',
  },
  'variants.couldNotSetPrimary': {
    defaultMessage: 'Could not set primary variant',
  },
  'variants.couldNotMoveToTrash': {
    defaultMessage: 'Could not move variant to trash',
  },
  'variants.couldNotRestore': { defaultMessage: 'Could not restore variant' },
  'variants.couldNotDelete': {
    defaultMessage: 'Could not permanently delete variant',
  },

  'comments.title': { defaultMessage: 'Comments' },
  'comments.unread': { defaultMessage: 'Unread' },
  'comments.unreadMessages': {
    defaultMessage: '{count, plural, one {# unread message} other {# unread messages}}',
    params: { count: 'number' },
  },
  'comments.unreadMentions': {
    defaultMessage: '{count, plural, one {# unread mention} other {# unread mentions}}',
    params: { count: 'number' },
  },
  'comments.moreReactions': { defaultMessage: 'More reactions' },
  'comments.messages': { defaultMessage: 'Messages' },
  'comments.loading': { defaultMessage: 'Loading comments...' },
  'comments.loadError': { defaultMessage: 'Could not load comments.' },
  'comments.empty': { defaultMessage: 'No comments yet.' },
  'comments.loadingUsers': { defaultMessage: 'Loading users...' },
  'comments.noUsersFound': { defaultMessage: 'No users found' },
  'comments.couldNotLoadReadState': {
    defaultMessage: 'Could not load comment read state',
  },
  'comments.couldNotSaveReadState': {
    defaultMessage: 'Could not save comment read state',
  },
  'comments.couldNotMarkNotifications': {
    defaultMessage: 'Could not mark notifications as read',
  },
  'comments.couldNotAdd': { defaultMessage: 'Could not add comment' },
  'comments.couldNotUpdateReaction': {
    defaultMessage: 'Could not update reaction',
  },
  'comments.searchEmoji': { defaultMessage: 'Search emoji' },
  'comments.writePlaceholder': { defaultMessage: 'Write a comment...' },

  'review.title': { defaultMessage: 'Review' },
  'review.approvals': {
    defaultMessage: '{count}/{required} approvals',
    params: { count: 'number', required: 'number' },
  },
  'review.requiredBeforePublishing': {
    defaultMessage: 'required before publishing',
  },
  'review.optional': { defaultMessage: 'optional' },
  'review.approved': { defaultMessage: 'Approved' },
  'review.changesRequested': { defaultMessage: 'Changes requested' },
  'review.reviewRequested': { defaultMessage: 'Review requested' },
  'review.feedbackRequested': { defaultMessage: 'Feedback requested' },
  'review.saveRevisionBeforeRequest': {
    defaultMessage: 'Save a new revision before requesting review again.',
  },
  'review.documentChanged': {
    defaultMessage: 'The document changed; request review again for the current revision.',
  },
  'review.readyToPublish': { defaultMessage: 'Ready to publish' },
  'review.newPagePublishDescription': {
    defaultMessage:
      'This is a new page, so it will be published directly in {language}. Promotion is only needed when replacing an existing published version.',
    params: { language: 'string' },
  },
  'review.publishPage': { defaultMessage: 'Publish page' },
  'review.noReviewersFound': { defaultMessage: 'No reviewers found.' },
  'review.selectAtLeastApprovers': {
    defaultMessage:
      'Select at least {count} eligible {count, plural, one {approver} other {approvers}} ({selected} selected).',
    params: { count: 'number', selected: 'number' },
  },
  'review.requestReview': { defaultMessage: 'Request review' },
  'review.approve': { defaultMessage: 'Approve' },
  'review.requestChanges': { defaultMessage: 'Request changes' },
  'review.loading': { defaultMessage: 'Loading review…' },
  'review.saveBeforeRequest': {
    defaultMessage: 'Save the document before requesting review.',
  },
  'review.required': { defaultMessage: 'required' },
  'review.notRequested': { defaultMessage: 'not requested' },
  'review.selectReviewers': { defaultMessage: 'Select reviewers' },
  'review.reviewersSelected': {
    defaultMessage: '{count} {count, plural, one {reviewer} other {reviewers}} selected',
    params: { count: 'number' },
  },
  'review.searchPeople': { defaultMessage: 'Search people…' },
  'review.reviewers': { defaultMessage: 'Reviewers' },
  'review.approver': { defaultMessage: 'Approver' },
  'review.feedback': { defaultMessage: 'Feedback' },
  'review.feedbackOnly': { defaultMessage: 'Feedback only' },
  'review.feedbackPlaceholder': {
    defaultMessage: 'Optional feedback for approval; required when requesting changes',
  },
  'review.requestedToast': { defaultMessage: 'Review requested' },
  'review.approvedToast': { defaultMessage: 'Review approved' },
  'review.changesRequestedToast': { defaultMessage: 'Changes requested' },
  'review.cancelledToast': { defaultMessage: 'Review cancelled' },
  'review.couldNotRequest': { defaultMessage: 'Could not request review' },
  'review.couldNotSubmit': { defaultMessage: 'Could not submit review' },
  'review.couldNotCancel': { defaultMessage: 'Could not cancel review' },

  'dynamicData.source': { defaultMessage: 'Source' },
  'dynamicData.item': { defaultMessage: 'Item' },
  'dynamicData.currentDocument': { defaultMessage: 'Current document' },
  'dynamicData.currentItem': { defaultMessage: 'Current item' },
  'dynamicData.field': { defaultMessage: 'Field' },
  'dynamicData.mappingMode': { defaultMessage: 'Mapping mode' },
  'dynamicData.directField': { defaultMessage: 'Direct field' },
  'dynamicData.relatedCollection': { defaultMessage: 'Related collection' },
  'dynamicData.nestedList': { defaultMessage: 'Nested list' },
  'dynamicData.nestedListHelp': {
    defaultMessage: 'Choose a direct field or map every item in a nested list.',
  },
  'dynamicData.fieldOn': { defaultMessage: 'Field on' },
  'dynamicData.collectionToQuery': { defaultMessage: 'Collection to query' },
  'dynamicData.relationTo': { defaultMessage: 'Relation to' },
  'dynamicData.arrayFieldToCollect': {
    defaultMessage: 'Array field to collect',
  },
  'dynamicData.maximumRelatedRecords': {
    defaultMessage: 'Maximum related records',
  },
  'dynamicData.sortRelatedRecordsBy': {
    defaultMessage: 'Sort related records by',
  },
  'dynamicData.noSort': { defaultMessage: 'No sort' },
  'dynamicData.sortDirection': { defaultMessage: 'Sort direction' },
  'dynamicData.ascending': { defaultMessage: 'Ascending' },
  'dynamicData.descending': { defaultMessage: 'Descending' },
  'dynamicData.limit': { defaultMessage: 'Limit' },
  'dynamicData.sortBy': { defaultMessage: 'Sort by' },
  'dynamicData.direction': { defaultMessage: 'Direction' },
  'dynamicData.conditions': { defaultMessage: 'Conditions' },
  'dynamicData.conditionsDescription': {
    defaultMessage: 'Filter the records used to build this list.',
  },
  'dynamicData.matchAll': { defaultMessage: 'Match all' },
  'dynamicData.matchAny': { defaultMessage: 'Match any' },
  'dynamicData.addCondition': { defaultMessage: 'Add condition' },
  'dynamicData.noConditions': {
    defaultMessage: 'No conditions. All records from this collection will match.',
  },
  'dynamicData.fixedValue': { defaultMessage: 'Fixed value' },
  'dynamicData.removeCondition': { defaultMessage: 'Remove condition' },
  'dynamicData.configureMapping': {
    defaultMessage: 'Configure {name} mapping',
    params: { name: 'string' },
  },
  'dynamicData.notLinked': { defaultMessage: 'Not linked' },
  'dynamicData.clear': { defaultMessage: 'Clear dynamic data' },
  'dynamicData.clearLink': { defaultMessage: 'Clear dynamic data link' },
  'dynamicData.title': { defaultMessage: 'Dynamic data' },
  'dynamicData.operator': { defaultMessage: 'Operator' },
  'dynamicData.currentField': { defaultMessage: 'Current field' },

  'modules.title': { defaultMessage: 'Modules' },
  'modules.topLevel': { defaultMessage: 'top level' },
  'modules.topLevelCount': {
    defaultMessage: '{count} top level',
    params: { count: 'number' },
  },
  'modules.empty': { defaultMessage: 'No modules yet.' },
  'modules.addModule': { defaultMessage: 'Add module' },
  'modules.addModuleDescription': {
    defaultMessage: 'Select a module to add to the iterator.',
  },
  'modules.savedModules': { defaultMessage: 'Saved modules' },
  'modules.loadingSaved': { defaultMessage: 'Loading saved modules...' },
  'modules.noSavedFound': { defaultMessage: 'No saved modules found.' },
  'modules.allModules': { defaultMessage: 'All modules' },
  'modules.noModulesFound': { defaultMessage: 'No modules found.' },
  'modules.moreFields': {
    defaultMessage: '+{count, plural, one {# field} other {# fields}}',
    params: { count: 'number' },
  },
  'modules.deleteSavedModule': { defaultMessage: 'Delete saved module' },
  'modules.deleteSavedConfirm': {
    defaultMessage: 'Permanently delete “{title}”? This cannot be undone.',
    params: { title: 'string' },
  },
  'modules.deleteSavedConfirmGeneric': {
    defaultMessage: 'Permanently delete this saved module? This cannot be undone.',
  },
  'modules.searchModules': { defaultMessage: 'Search modules' },
  'modules.moduleVisibility': { defaultMessage: 'Module visibility' },
  'modules.unlinkGlobalModule': { defaultMessage: 'Unlink global module' },
  'modules.visibilityTitle': {
    defaultMessage: '{title} visibility',
    params: { title: 'string' },
  },
  'modules.visibilityDescription': {
    defaultMessage:
      'Choose when this module should be rendered. The rule is shared, but it is evaluated using each {contentType}.',
    params: { contentType: 'string' },
  },
  'modules.visibility': { defaultMessage: 'Visibility' },
  'modules.alwaysVisible': { defaultMessage: 'Always visible' },
  'modules.visibleWhenNotEmpty': {
    defaultMessage: 'Visible when a field is not empty',
  },
  'modules.visibleWhenEmpty': {
    defaultMessage: 'Visible when a field is empty',
  },
  'modules.documentField': { defaultMessage: 'Document field' },
  'modules.selectField': { defaultMessage: 'Select a field' },
  'modules.noVisibilityFields': {
    defaultMessage: 'This content type has no fields available for visibility conditions.',
  },
  'modules.saveVisibility': { defaultMessage: 'Save visibility' },
  'modules.deleted': {
    defaultMessage: '{title} deleted',
    params: { title: 'string' },
  },
  'modules.couldNotDelete': { defaultMessage: 'Could not delete module' },
  'modules.onlyRelationCanSave': {
    defaultMessage: 'Only relation modules can be saved',
  },
  'modules.cannotSaveGlobally': {
    defaultMessage: 'This module cannot be saved globally',
  },
  'modules.noPermissionSaveGlobally': {
    defaultMessage: 'You do not have permission to save this module globally',
  },
  'modules.fixBeforeSaving': {
    defaultMessage: 'Please fix this module before saving it',
  },
  'modules.alreadySaved': { defaultMessage: 'This module is already saved' },
  'modules.cannotSaveYet': {
    defaultMessage: 'This module cannot be saved yet',
  },
  'modules.createdNoId': {
    defaultMessage: 'The module was created but no id was returned',
  },
  'modules.saved': {
    defaultMessage: '{title} saved',
    params: { title: 'string' },
  },
  'modules.couldNotSave': { defaultMessage: 'Could not save module' },
  'modules.onlyRelationCanUnlink': {
    defaultMessage: 'Only relation modules can be unlinked',
  },
  'modules.alreadyLocal': { defaultMessage: 'This module is already local' },
  'modules.unlinked': {
    defaultMessage: '{title} unlinked',
    params: { title: 'string' },
  },
  'modules.couldNotUnlink': { defaultMessage: 'Could not unlink module' },
  'modules.documentFallback': { defaultMessage: 'document' },
  'modules.otherCategory': { defaultMessage: 'Other' },
  'modules.conditional': { defaultMessage: 'Conditional' },
  'modules.hiddenForDocument': {
    defaultMessage: 'Hidden for this {contentType}',
    params: { contentType: 'string' },
  },
  'modules.navigation': { defaultMessage: 'Module navigation' },
  'modules.reorder': { defaultMessage: 'Reorder module' },
  'modules.toggleModule': {
    defaultMessage: 'Toggle {title}',
    params: { title: 'string' },
  },
  'modules.changeVisibility': {
    defaultMessage: 'Change {title} visibility',
    params: { title: 'string' },
  },
  'modules.saveModule': {
    defaultMessage: 'Save {title}',
    params: { title: 'string' },
  },
  'modules.unlinkModule': {
    defaultMessage: 'Unlink {title}',
    params: { title: 'string' },
  },
  'modules.fallbackTitle': { defaultMessage: 'Module' },
  'modules.fallbackTitleNumbered': {
    defaultMessage: 'Module {number}',
    params: { number: 'number' },
  },

  'common.unknown': { defaultMessage: 'Unknown' },
  'common.enabled': { defaultMessage: 'Enabled' },
  'common.default': { defaultMessage: 'Default' },
  'common.code': { defaultMessage: 'Code' },
  'common.parent': { defaultMessage: 'Parent' },
  'common.path': { defaultMessage: 'Path' },
  'common.order': { defaultMessage: 'Order' },
  'common.value': { defaultMessage: 'Value' },
  'common.reset': { defaultMessage: 'Reset' },
  'common.verify': { defaultMessage: 'Verify' },
  'common.none': { defaultMessage: 'None' },
  'common.custom': { defaultMessage: 'Custom' },
  'common.loadingManager': { defaultMessage: 'Loading manager' },
  'common.bootstrapFailed': { defaultMessage: 'Bootstrap failed:' },
  'common.username': { defaultMessage: 'Username' },
  'common.email': { defaultMessage: 'Email' },
  'common.password': { defaultMessage: 'Password' },
  'common.role': { defaultMessage: 'Role' },
  'common.locale': { defaultMessage: 'Locale' },
  'common.contentType': { defaultMessage: 'Content Type' },
  'common.function': { defaultMessage: 'Function' },
  'common.from': { defaultMessage: 'From' },
  'common.to': { defaultMessage: 'To' },
  'common.openNamed': {
    defaultMessage: 'Open {title}',
    params: { title: 'string' },
  },
  'common.deleteNamedConfirm': {
    defaultMessage: 'Are you sure you want to delete {name}?',
    params: { name: 'string' },
  },

  'dashboard.openFavorite': {
    defaultMessage: 'Open {title}',
    params: { title: 'string' },
  },
  'dashboard.removeFromFavoritesTooltip': {
    defaultMessage: 'Remove from favorites',
  },
  'dashboard.lastUpdated': {
    defaultMessage: 'Last updated {date}',
    params: { date: 'string' },
  },
  'dashboard.lastUpdatedBy': {
    defaultMessage: 'Last updated by {name}',
    params: { name: 'string' },
  },
  'dashboard.openNotificationFor': {
    defaultMessage: 'Open notification for {title}',
    params: { title: 'string' },
  },

  'account.profile': { defaultMessage: 'Profile' },
  'account.avatar': { defaultMessage: 'Avatar' },
  'account.uploadImage': { defaultMessage: 'Upload image' },
  'account.mfa.title': { defaultMessage: 'Multi-Factor Authentication' },
  'account.mfa.twoFactor': { defaultMessage: 'Two-Factor Authentication' },
  'account.mfa.totp': { defaultMessage: 'TOTP' },
  'account.mfa.webauthn': { defaultMessage: 'WebAuthn' },
  'account.mfa.scanBefore': {
    defaultMessage: 'Scan the QR code below with your authenticator app, or',
  },
  'account.mfa.clickLink': { defaultMessage: 'click the link' },
  'account.mfa.scanAfter': {
    defaultMessage:
      'to set it up manually. Then, enter the 6-digit code from your app to verify and complete the setup.',
  },
  'account.mfa.verificationCode': { defaultMessage: 'Verification code' },
  'account.mfa.deviceName': { defaultMessage: 'Device Name' },
  'account.mfa.registerDevice': { defaultMessage: 'Register Device' },
  'account.mfa.deviceNamePlaceholder': {
    defaultMessage: 'Enter your device name',
  },
  'account.mfa.deviceRegistered': {
    defaultMessage: 'Device registered successfully! Your account is now more secure.',
  },
  'account.mfa.registerDeviceFailed': {
    defaultMessage: 'Failed to register the device. Please try again.',
  },
  'account.mfa.totpSetupComplete': {
    defaultMessage: '2FA setup complete! Your account is now more secure.',
  },
  'account.mfa.verifyCodeFailed': {
    defaultMessage: 'Failed to verify the code. Please try again.',
  },
  'account.mfa.setupWarning': {
    defaultMessage: 'You have not set up 2FA yet. Please set it up to secure your account.',
  },
  'account.mfa.setupAction': { defaultMessage: 'Set up 2FA' },
  'account.mfa.updateAction': { defaultMessage: 'Update 2FA' },
  'account.mfa.enabledWithMethod': {
    defaultMessage: 'You have 2FA enabled using {method}.',
    params: { method: 'string' },
  },
  'account.mfa.notEnabled': { defaultMessage: 'You do not have 2FA enabled.' },
  'account.mfa.qrAlt': { defaultMessage: 'TOTP setup QR code' },
  'account.mfa.recoveryCodesTitle': { defaultMessage: 'Save your recovery codes' },
  'account.mfa.recoveryCodesDescription': {
    defaultMessage:
      'Each code can be used once. Store them somewhere safe; they will not be shown again.',
  },
  'account.mfa.copyRecoveryCodes': { defaultMessage: 'Copy codes' },
  'account.mfa.recoveryCodesCopied': { defaultMessage: 'Codes copied' },
  'account.mfa.savedRecoveryCodes': { defaultMessage: 'I have saved them' },
  'account.mfa.noBypassWarning': {
    defaultMessage:
      'MFA cannot be bypassed from the CMS. If you lose every MFA method and recovery code, contact an authorized person through a channel outside the CMS.',
  },
  'account.mfa.regenerateRecoveryCodes': {
    defaultMessage: 'Replace recovery codes',
  },
  'account.mfa.regenerateDescription': {
    defaultMessage:
      'Enter your current password. Existing recovery codes will stop working immediately.',
  },
  'account.mfa.currentPassword': { defaultMessage: 'Current password' },
  'account.mfa.currentPasswordInvalid': {
    defaultMessage: 'The current password is not valid.',
  },
  'account.mfa.regenerateAction': { defaultMessage: 'Generate new codes' },
  'account.mfa.regenerateFailed': {
    defaultMessage: 'Recovery codes could not be replaced.',
  },
  'account.profileImageMustBeImage': {
    defaultMessage: 'Profile image must be an image file',
  },
  'account.updated': { defaultMessage: 'Account updated' },
  'account.updateError': { defaultMessage: 'Could not update account' },
  'account.sessions.title': { defaultMessage: 'Active Sessions' },
  'account.sessions.current': { defaultMessage: 'Current session' },
  'account.sessions.createdAt': { defaultMessage: 'Created At' },
  'account.sessions.expiresAt': { defaultMessage: 'Expires At' },
  'account.sessions.token': { defaultMessage: 'Token' },
  'account.sessions.delete': { defaultMessage: 'Delete session' },
  'account.sessions.deleteConfirm': {
    defaultMessage: 'Are you sure you want to delete this session?',
  },
  'account.sessions.deleted': {
    defaultMessage: 'Session deleted successfully!',
  },
  'account.sessions.deleteError': {
    defaultMessage: 'Error: {reason}',
    params: { reason: 'string' },
  },

  'mfa.challengeExpired': { defaultMessage: 'Challenge Expired' },
  'mfa.challengeExpiredDescription': {
    defaultMessage:
      'Your 2FA challenge has expired. Please login again to receive a new challenge.',
  },
  'mfa.unsupportedMethod': {
    defaultMessage: 'Unsupported 2FA method. Please try logging in again.',
  },
  'mfa.verifyLogin': { defaultMessage: 'Verify your login' },
  'mfa.verifyLoginDescription': {
    defaultMessage:
      'Enter the verification code from your authenticator app to complete the login process.',
  },
  'mfa.webauthnTitle': {
    defaultMessage: 'Complete WebAuthn Authentication',
  },
  'mfa.webauthnDescription': {
    defaultMessage:
      'Please complete the WebAuthn authentication process using your registered device. Follow the prompts on your device to authenticate and access your account securely.',
  },
  'mfa.webauthnOptionsError': {
    defaultMessage: 'Failed to get authentication options. Please try again.',
  },
  'mfa.authenticationFailed': {
    defaultMessage: 'Authentication failed. Please try again.',
  },
  'mfa.verifyCodeError': {
    defaultMessage: 'An error occurred while verifying the code. Please try again.',
  },
  'mfa.invalidCode': { defaultMessage: 'The verification code is not valid.' },
  'mfa.useRecoveryCode': { defaultMessage: 'Use a recovery code' },
  'mfa.usePrimaryMethod': { defaultMessage: 'Use my primary MFA method' },
  'mfa.recoveryCodeTitle': { defaultMessage: 'Enter a recovery code' },
  'mfa.recoveryCodeDescription': {
    defaultMessage:
      'Recovery codes are single-use and replace your usual MFA method for this login.',
  },
  'mfa.recoveryCodeLabel': { defaultMessage: 'Recovery code' },
  'mfa.invalidRecoveryCode': {
    defaultMessage: 'This recovery code is not valid or has already been used.',
  },
  'mfa.recoveryCodeError': {
    defaultMessage: 'The recovery code could not be verified.',
  },
  'mfa.noRecoveryAccess': {
    defaultMessage:
      'If you cannot access MFA or a recovery code, contact an authorized person outside the CMS.',
  },

  'users.twoFactorEnabled': { defaultMessage: 'Two Factor Enabled' },
  'users.add': { defaultMessage: 'Add User' },
  'users.createTitle': { defaultMessage: 'Create user' },
  'users.createDescription': {
    defaultMessage: 'Create a new user by filling out the form.',
  },
  'users.editTitle': { defaultMessage: 'Edit user' },
  'users.editDescription': {
    defaultMessage: 'Edit the user by filling out the form.',
  },
  'users.deleteTitle': { defaultMessage: 'Delete user' },
  'users.deleteConfirm': {
    defaultMessage: 'Are you sure you want to delete this user?',
  },
  'users.updated': { defaultMessage: 'User updated successfully!' },
  'users.created': { defaultMessage: 'User created successfully!' },
  'users.saveError': { defaultMessage: 'Error saving user' },
  'users.deleted': { defaultMessage: 'User deleted successfully!' },
  'users.deleteError': { defaultMessage: 'Error deleting user' },
  'users.passwordPlaceholder': { defaultMessage: 'Secret password' },
  'users.selectRole': { defaultMessage: 'Select role' },

  'apiRoutes.loading': { defaultMessage: 'Loading API operations...' },
  'apiRoutes.loadFailed': {
    defaultMessage: 'Failed to load API operations.',
  },
  'apiRoutes.empty': { defaultMessage: 'No API operations found.' },
  'apiRoutes.route': { defaultMessage: 'Route' },
  'apiRoutes.inputSchema': { defaultMessage: 'Input Schema' },
  'apiRoutes.inputSchemaDescription': {
    defaultMessage: 'JSON Schema generated from the contract input.',
  },
  'apiRoutes.outputSchema': { defaultMessage: 'Output Schema' },
  'apiRoutes.outputSchemaDescription': {
    defaultMessage: 'JSON Schema generated from the contract output.',
  },
  'apiRoutes.playground': { defaultMessage: 'Playground' },
  'apiRoutes.playgroundDescription': {
    defaultMessage: 'Execute the operation with the current manager client.',
  },
  'apiRoutes.schemaDefault': { defaultMessage: 'default:' },
  'apiRoutes.schemaValues': { defaultMessage: 'values:' },
  'apiRoutes.schemaMin': { defaultMessage: 'min:' },
  'apiRoutes.schemaMax': { defaultMessage: 'max:' },
  'apiRoutes.schemaMinLength': { defaultMessage: 'min length:' },
  'apiRoutes.schemaMaxLength': { defaultMessage: 'max length:' },
  'apiRoutes.noSchema': { defaultMessage: 'No schema' },
  'apiRoutes.rawJsonSchema': { defaultMessage: 'Raw JSON Schema' },

  'routes.pluginNotFound': {
    defaultMessage: 'Plugin route definition not found:',
  },
  'routes.unknown': { defaultMessage: 'Unknown route:' },
  'routes.definitionNotFound': {
    defaultMessage: 'Route definition not found:',
  },

  'settings.languages.add': { defaultMessage: 'Add Language' },
  'settings.languages.createTitle': { defaultMessage: 'Create language' },
  'settings.languages.createDescription': {
    defaultMessage: 'Create a new language by filling out the form.',
  },
  'settings.languages.editTitle': { defaultMessage: 'Edit language' },
  'settings.languages.editDescription': {
    defaultMessage: 'Edit the language by filling out the form.',
  },
  'settings.languages.deleteTitle': { defaultMessage: 'Delete language' },
  'settings.languages.deleteConfirm': {
    defaultMessage: 'Are you sure you want to delete this language?',
  },
  'settings.languages.setAsDefault': { defaultMessage: 'Set as default' },
  'settings.languages.noParent': { defaultMessage: 'No parent' },
  'settings.languages.deleteNamed': {
    defaultMessage: 'Delete {name} ({code})',
    params: { name: 'string', code: 'string' },
  },
  'settings.languages.editNamed': {
    defaultMessage: 'Edit {name} ({code})',
    params: { name: 'string', code: 'string' },
  },
  'settings.languages.updated': {
    defaultMessage: 'Language updated successfully!',
  },
  'settings.languages.created': {
    defaultMessage: 'Language created successfully!',
  },
  'settings.languages.saveError': { defaultMessage: 'Error saving language' },
  'settings.languages.deleted': {
    defaultMessage: 'Language deleted successfully!',
  },
  'settings.languages.deleteError': {
    defaultMessage: 'Error deleting language',
  },
  'settings.languages.defaultUpdated': {
    defaultMessage: 'Default language updated',
  },
  'settings.languages.defaultUpdateError': {
    defaultMessage: 'Error updating default language',
  },
  'settings.languages.namePlaceholder': { defaultMessage: 'English' },
  'settings.languages.selectParent': {
    defaultMessage: 'Select parent language',
  },

  'settings.roles.add': { defaultMessage: 'Add Role' },
  'settings.roles.deleteTitle': { defaultMessage: 'Delete role' },
  'settings.roles.deleteConfirm': {
    defaultMessage: 'Are you sure you want to delete this role?',
  },
  'settings.roles.toggleAll': { defaultMessage: 'Toggle all' },
  'settings.roles.updated': { defaultMessage: 'Role updated successfully!' },
  'settings.roles.created': { defaultMessage: 'Role created successfully!' },
  'settings.roles.deleted': { defaultMessage: 'Role deleted successfully!' },
  'settings.roles.saveError': { defaultMessage: 'Error saving role' },
  'settings.roles.deleteError': { defaultMessage: 'Error deleting role' },
  'settings.roles.namePlaceholder': { defaultMessage: 'Admin' },

  'settings.routes.hasPage': { defaultMessage: 'Has page' },
  'settings.routes.dynamic': { defaultMessage: 'Dynamic' },
  'settings.routes.basePath': { defaultMessage: 'Base Path' },
  'settings.routes.parentRelationField': {
    defaultMessage: 'Parent Relation Field',
  },
  'settings.routes.editLayoutModules': {
    defaultMessage: 'Edit layout modules',
  },
  'settings.routes.editTitle': { defaultMessage: 'Edit route' },
  'settings.routes.editDescription': {
    defaultMessage: 'Edit the route by filling out the form.',
  },
  'settings.routes.literalPath': { defaultMessage: 'Literal path' },
  'settings.routes.routePaths': { defaultMessage: 'Route paths' },
  'settings.routes.homePage': { defaultMessage: 'Home page' },
  'settings.routes.homePageDescription': {
    defaultMessage:
      'The selected page will resolve to the locale root path, for example `/` for the default language or `/es/` instead of `/es/home/`.',
  },
  'settings.routes.noHomePage': { defaultMessage: 'No home page' },
  'settings.routes.saveHomePage': { defaultMessage: 'Save home page' },
  'settings.routes.layoutModulesDescription': {
    defaultMessage:
      'Select route defaults. Each content entry can override these modules from its edit screen.',
  },
  'settings.routes.noModule': { defaultMessage: 'No module' },
  'settings.routes.saveLayoutModules': {
    defaultMessage: 'Save layout modules',
  },
  'settings.routes.routeId': { defaultMessage: 'Route ID' },
  'settings.routes.contentTypeId': { defaultMessage: 'Content Type ID' },
  'settings.routes.regenerate': { defaultMessage: 'Regenerate routes' },
  'settings.routes.regenerateTitle': {
    defaultMessage: 'Regenerate all routes',
  },
  'settings.routes.regenerateDescription': {
    defaultMessage:
      'Are you sure you want to regenerate all routes? This process can be time-consuming if the number of routes is large.',
  },
  'settings.routes.regenerateConfirm': {
    defaultMessage: 'Yes, regenerate',
  },
  'settings.routes.updated': {
    defaultMessage: 'Route updated successfully!',
  },
  'settings.routes.updateError': { defaultMessage: 'Error updating route' },
  'settings.routes.regenerateError': {
    defaultMessage: 'Error regenerating routes',
  },
  'settings.routes.regenerated': {
    defaultMessage: 'Routes regenerated successfully',
  },
  'settings.routes.homePageUpdated': {
    defaultMessage: 'Home page updated successfully!',
  },
  'settings.routes.homePageUpdateError': {
    defaultMessage: 'Error updating home page',
  },
  'settings.routes.layoutModulesUpdated': {
    defaultMessage: 'Layout modules updated successfully!',
  },
  'settings.routes.layoutModulesUpdateError': {
    defaultMessage: 'Error updating layout modules',
  },
  'settings.routes.selectLanguage': { defaultMessage: 'Select language' },
  'settings.routes.selectPage': { defaultMessage: 'Select a page' },
  'settings.routes.searchPath': { defaultMessage: 'Search path...' },

  'settings.seo.description': {
    defaultMessage: 'Configure default metadata, social previews and title templates.',
  },
  'settings.seo.save': { defaultMessage: 'Save SEO settings' },
  'settings.seo.fixErrors': {
    defaultMessage: 'Please fix SEO settings errors',
  },
  'settings.seo.saved': { defaultMessage: 'SEO settings saved' },
  'settings.seo.saveError': { defaultMessage: 'Error saving SEO settings' },

  'settings.llms.title': { defaultMessage: 'llms.txt' },
  'settings.llms.description': {
    defaultMessage:
      'Publish a curated Markdown guide to the site and its most useful public resources.',
  },
  'settings.llms.save': { defaultMessage: 'Save llms.txt settings' },
  'settings.llms.fixErrors': {
    defaultMessage: 'Please fix llms.txt settings errors',
  },
  'settings.llms.saved': { defaultMessage: 'llms.txt settings saved' },
  'settings.llms.saveError': { defaultMessage: 'Error saving llms.txt settings' },
  'settings.llms.section': { defaultMessage: 'Section' },
  'settings.llms.entry': { defaultMessage: 'Link' },
  'field.llmsEnabled': { defaultMessage: 'Publish llms.txt' },
  'field.llmsTitle': { defaultMessage: 'Site title' },
  'field.llmsSummary': { defaultMessage: 'Site summary' },
  'field.llmsDetails': { defaultMessage: 'Additional guidance' },
  'field.llmsSections': { defaultMessage: 'Sections' },
  'field.llmsSectionTitle': { defaultMessage: 'Section title' },
  'field.llmsOptional': { defaultMessage: 'Secondary content' },
  'field.llmsOptionalDescription': {
    defaultMessage: 'AI tools may skip these links to save context.',
  },
  'field.llmsEntries': { defaultMessage: 'Links' },
  'field.llmsLink': { defaultMessage: 'Page or URL' },
  'field.llmsLinkDescription': { defaultMessage: 'Description' },

  'settings.system.createBackup': { defaultMessage: 'Create backup' },
  'settings.system.backups': { defaultMessage: 'Backups' },
  'settings.system.noBackups': { defaultMessage: 'No backups yet.' },
  'settings.system.backupMeta': {
    defaultMessage: '{date} · {count} docs · {types}',
    params: { date: 'string', count: 'number', types: 'string' },
  },
  'settings.system.schemaState': { defaultMessage: 'Schema State' },
  'settings.system.pendingMigrations': {
    defaultMessage: '{count, plural, one {# pending migration} other {# pending migrations}}',
    params: { count: 'number' },
  },
  'settings.system.noSchemaState': {
    defaultMessage: 'No schema state recorded.',
  },
  'settings.system.version': {
    defaultMessage: 'v{version}',
    params: { version: 'number' },
  },
  'settings.system.migrationLedger': { defaultMessage: 'Migration Ledger' },
  'settings.system.noMigrations': {
    defaultMessage: 'No migrations executed yet.',
  },
  'settings.system.migrationMeta': {
    defaultMessage: '{contentType} · v{from} to v{to} · {date}',
    params: {
      contentType: 'string',
      from: 'number',
      to: 'number',
      date: 'string',
    },
  },
  'settings.system.restoreBackup': { defaultMessage: 'Restore backup' },
  'settings.system.restoreDescription': {
    defaultMessage:
      'This will replace the current database documents for the backed up content types. A safety backup will be created before restoring.',
  },
  'settings.system.filesNotRestored': {
    defaultMessage: 'Files are not restored',
  },
  'settings.system.filesNotRestoredDescription': {
    defaultMessage:
      'Backups only store database documents. Images and other uploaded files are not included, so deleted or changed assets will not be recovered by this restore.',
  },
  'settings.system.backupCreated': {
    defaultMessage: 'Backup created successfully',
  },
  'settings.system.backupRestored': {
    defaultMessage: 'Backup restored successfully',
  },

  'settings.reviewPolicies.title': { defaultMessage: 'Review policies' },
  'settings.reviewPolicies.description': {
    defaultMessage: 'Require approvals by author role and content type.',
  },
  'settings.reviewPolicies.authorRole': { defaultMessage: 'Author role' },
  'settings.reviewPolicies.contentTypes': {
    defaultMessage: 'Content types',
  },
  'settings.reviewPolicies.requiredApprovals': {
    defaultMessage: 'Required approvals',
  },
  'settings.reviewPolicies.reviewerRoles': {
    defaultMessage: 'Reviewer roles',
  },
  'settings.reviewPolicies.for': { defaultMessage: 'for' },
  'settings.reviewPolicies.approvalsFrom': {
    defaultMessage: '{count, plural, one {# approval} other {# approvals}} from',
    params: { count: 'number' },
  },
  'settings.reviewPolicies.empty': {
    defaultMessage: 'No review policies configured.',
  },
  'settings.reviewPolicies.deleteTitle': {
    defaultMessage: 'Delete review policy',
  },
  'settings.reviewPolicies.deleteDescription': {
    defaultMessage:
      'This policy will stop requiring its configured review workflow. This action cannot be undone.',
  },
  'settings.reviewPolicies.saved': { defaultMessage: 'Review policy saved' },
  'settings.reviewPolicies.deleted': {
    defaultMessage: 'Review policy deleted',
  },
  'settings.reviewPolicies.saveError': {
    defaultMessage: 'Could not save review policy',
  },
  'settings.reviewPolicies.deleteError': {
    defaultMessage: 'Could not delete review policy',
  },

  'settings.robots.title': { defaultMessage: 'Robots.txt' },
  'settings.robots.description': {
    defaultMessage: 'Configure crawler rules, crawl delays, sitemap hints and host directives.',
  },
  'settings.robots.newRule': { defaultMessage: 'New rule' },
  'settings.robots.formDescription': {
    defaultMessage: 'Rules are rendered by order and grouped by user-agent.',
  },
  'settings.robots.directive': { defaultMessage: 'Directive' },
  'settings.robots.allow': { defaultMessage: 'Allow' },
  'settings.robots.disallow': { defaultMessage: 'Disallow' },
  'settings.robots.crawlDelayOption': { defaultMessage: 'Crawl-delay' },
  'settings.robots.sitemap': { defaultMessage: 'Sitemap' },
  'settings.robots.host': { defaultMessage: 'Host' },
  'settings.robots.comment': { defaultMessage: 'Comment' },
  'settings.robots.userAgent': { defaultMessage: 'User-agent' },
  'settings.robots.crawlDelay': { defaultMessage: 'Crawl delay' },
  'settings.robots.target': { defaultMessage: 'Target' },
  'settings.robots.deleteTitle': { defaultMessage: 'Delete robots rule' },
  'settings.robots.updated': { defaultMessage: 'Robots rule updated' },
  'settings.robots.created': { defaultMessage: 'Robots rule created' },
  'settings.robots.deleted': { defaultMessage: 'Robots rule deleted' },
  'settings.robots.saveError': { defaultMessage: 'Error saving robots rule' },
  'settings.robots.deleteError': {
    defaultMessage: 'Error deleting robots rule',
  },
  'settings.robots.namePlaceholder': {
    defaultMessage: 'Block private files',
  },

  'settings.redirects.showHelp': { defaultMessage: 'Show help' },
  'settings.redirects.title': { defaultMessage: 'Redirect Rules' },
  'settings.redirects.description': {
    defaultMessage:
      'Define source path patterns and destination templates. You can reuse dynamic params like `{slug}`, choose HTTP status codes, add header-based conditions, and run small helper functions.',
  },
  'settings.redirects.new': { defaultMessage: 'New redirect' },
  'settings.redirects.formDescription': {
    defaultMessage: 'Configure rule matching, destination behavior and optional conditional logic.',
  },
  'settings.redirects.nameHelp': {
    defaultMessage: 'Internal label to identify this redirect in manager.',
  },
  'settings.redirects.enabledHelp': {
    defaultMessage: 'Turn the rule on or off without deleting it.',
  },
  'settings.redirects.sourcePath': { defaultMessage: 'Source path' },
  'settings.redirects.sourcePathHelp': {
    defaultMessage: 'Incoming path pattern. Use placeholders like `{slug}`.',
  },
  'settings.redirects.destinationPath': {
    defaultMessage: 'Destination path',
  },
  'settings.redirects.destinationPathHelp': {
    defaultMessage: 'Output path template. Reuse params from source placeholders.',
  },
  'settings.redirects.previewSample': {
    defaultMessage: 'Preview with sample path',
  },
  'settings.redirects.previewHelp': {
    defaultMessage:
      'Tests only path token matching. Header conditions and mini functions are not simulated here.',
  },
  'settings.redirects.result': { defaultMessage: 'Result:' },
  'settings.redirects.statusCode': { defaultMessage: 'Status code' },
  'settings.redirects.status301': { defaultMessage: '301 - Permanent' },
  'settings.redirects.status302': { defaultMessage: '302 - Temporary' },
  'settings.redirects.status307': {
    defaultMessage: '307 - Temporary (method preserved)',
  },
  'settings.redirects.status308': {
    defaultMessage: '308 - Permanent (method preserved)',
  },
  'settings.redirects.statusHelp': {
    defaultMessage: 'Pick a common redirect status or define a custom one.',
  },
  'settings.redirects.customStatus': { defaultMessage: 'Custom status' },
  'settings.redirects.customStatusHelp': {
    defaultMessage: 'Must be a valid 3xx HTTP status (300-399).',
  },
  'settings.redirects.preserveQuery': {
    defaultMessage: 'Preserve query string',
  },
  'settings.redirects.preserveQueryHelp': {
    defaultMessage: 'Example: if input is `/old?a=1`, destination becomes `/new?a=1` when enabled.',
  },
  'settings.redirects.headerConditions': {
    defaultMessage: 'Header conditions',
  },
  'settings.redirects.headerConditionsTooltip': {
    defaultMessage:
      'Use this when the same path should redirect only for certain requests, for example a language, country, device, or custom proxy header.',
  },
  'settings.redirects.headerConditionsHelp': {
    defaultMessage: 'Optional filter: apply this redirect only when request headers match.',
  },
  'settings.redirects.matchMode': { defaultMessage: 'Match mode' },
  'settings.redirects.noCondition': { defaultMessage: 'No condition' },
  'settings.redirects.headerExists': { defaultMessage: 'Header exists' },
  'settings.redirects.equals': { defaultMessage: 'Equals' },
  'settings.redirects.contains': { defaultMessage: 'Contains' },
  'settings.redirects.startsWith': { defaultMessage: 'Starts with' },
  'settings.redirects.regex': { defaultMessage: 'Regex' },
  'settings.redirects.headerName': { defaultMessage: 'Header name' },
  'settings.redirects.headerNameHelp': {
    defaultMessage: 'Use lowercase names like `accept-language`.',
  },
  'settings.redirects.headerValue': { defaultMessage: 'Header value' },
  'settings.redirects.headerValueHelp': {
    defaultMessage: 'For regex mode, this field is treated as a regex pattern.',
  },
  'settings.redirects.miniFunction': { defaultMessage: 'Mini function' },
  'settings.redirects.miniFunctionTooltip': {
    defaultMessage:
      'Mini functions run after path and header matching. They can add template params, then destination path is rendered.',
  },
  'settings.redirects.miniFunctionHelp': {
    defaultMessage: 'Optional custom helper to compute extra params from request headers.',
  },
  'settings.redirects.acceptLanguageToParam': {
    defaultMessage: 'acceptLanguageToParam',
  },
  'settings.redirects.headerValueToParam': {
    defaultMessage: 'headerValueToParam',
  },
  'settings.redirects.functionHints': {
    defaultMessage:
      '`acceptLanguageToParam` maps Accept-Language to a template param. `headerValueToParam` maps any header value.',
  },
  'settings.redirects.functionConfig': {
    defaultMessage: 'Function config (JSON)',
  },
  'settings.redirects.functionConfigHelp': {
    defaultMessage: 'JSON config consumed by the selected mini function.',
  },
  'settings.redirects.deleteTitle': { defaultMessage: 'Delete redirect' },
  'settings.redirects.updated': { defaultMessage: 'Redirect updated' },
  'settings.redirects.created': { defaultMessage: 'Redirect created' },
  'settings.redirects.deleted': { defaultMessage: 'Redirect deleted' },
  'settings.redirects.saveError': { defaultMessage: 'Error saving redirect' },
  'settings.redirects.deleteError': {
    defaultMessage: 'Error deleting redirect',
  },
  'settings.redirects.namePlaceholder': {
    defaultMessage: 'Blog migration rule',
  },
  'settings.redirects.selectStatus': { defaultMessage: 'Select status' },

  'settings.literals.defaultLocale': {
    defaultMessage: 'Default locale:',
  },
  'settings.literals.namespaces': { defaultMessage: 'Namespaces' },
  'settings.literals.keysCount': {
    defaultMessage: 'Keys ({count})',
    params: { count: 'number' },
  },
  'settings.literals.translated': { defaultMessage: 'Translated' },
  'settings.literals.fallback': { defaultMessage: 'Fallback' },
  'settings.literals.invalidIcu': { defaultMessage: 'Invalid ICU' },
  'settings.literals.selectKey': {
    defaultMessage: 'Select a literal key.',
  },
  'settings.literals.usedBy': { defaultMessage: 'Used by' },
  'settings.literals.noUsage': { defaultMessage: 'No usage metadata' },
  'settings.literals.availableVars': {
    defaultMessage: 'Available ICU variables',
  },
  'settings.literals.noVariables': { defaultMessage: 'No variables' },
  'settings.literals.icuIssues': {
    defaultMessage: 'Stored translation has ICU validation issues',
  },
  'settings.literals.missing': { defaultMessage: 'Missing:' },
  'settings.literals.kindMismatch': { defaultMessage: 'Kind mismatch:' },
  'settings.literals.defaultMessage': {
    defaultMessage: 'Default message (base)',
  },
  'settings.literals.translation': { defaultMessage: 'Translation' },
  'settings.literals.noPermission': {
    defaultMessage: "You don't have permissions to edit literals",
  },
  'settings.literals.saveTranslation': {
    defaultMessage: 'Save translation',
  },
  'settings.literals.localeWithCode': {
    defaultMessage: '{name} ({code})',
    params: { name: 'string', code: 'string' },
  },
  'settings.literals.varWithKind': {
    defaultMessage: '{name} ({kind})',
    params: { name: 'string', kind: 'string' },
  },
  'settings.literals.translationSaved': {
    defaultMessage: 'Literal translation saved',
  },
  'settings.literals.saveError': { defaultMessage: 'Error saving literal' },
  'settings.literals.selectLocale': { defaultMessage: 'Select locale' },
  'settings.literals.search': {
    defaultMessage: 'Search by key, description or module',
  },

  'account.password.update': { defaultMessage: 'Update Password' },
  'account.password.editTitle': { defaultMessage: 'Edit Password' },
  'account.password.editDescription': { defaultMessage: 'Edit password' },
  'account.password.current': { defaultMessage: 'Current Password' },
  'account.password.new': { defaultMessage: 'New Password' },
  'account.password.confirmNew': { defaultMessage: 'Confirm New Password' },
  'account.password.mismatch': { defaultMessage: 'Passwords do not match' },
  'account.password.updated': { defaultMessage: 'Password updated successfully' },
  'account.password.updateError': {
    defaultMessage: 'Error updating password: {reason}',
    params: { reason: 'string' },
  },

  'help.tutorialsPromptTitle': {
    defaultMessage: 'Enable tutorials?',
  },
  'help.tutorialsPromptDescription': {
    defaultMessage:
      'We will show a quick guide the first time you visit each screen. You can always launch help from the sidebar.',
  },
  'help.tutorialsDecline': { defaultMessage: 'No thanks' },
  'help.tutorialsEnable': { defaultMessage: 'Enable tutorials' },

  'editor.characters': { defaultMessage: 'characters' },
  'editor.words': { defaultMessage: 'words' },
  'editor.counter': {
    defaultMessage: '{characters} characters | {words} words',
    params: { characters: 'number', words: 'number' },
  },

  'combobox.createNew': {
    defaultMessage: 'Create new {type}: "{value}"',
    params: { type: 'string', value: 'string' },
  },

  'unauthorized.title': { defaultMessage: 'Unauthorized' },
  'unauthorized.defaultMessage': {
    defaultMessage: 'You are not authorized to access this resource.',
  },
  'unauthorized.neededPermission': { defaultMessage: 'Needed permission:' },
  'unauthorized.neededPermissionAny': {
    defaultMessage: 'Needed permission (any):',
  },

  'idColumn.copied': { defaultMessage: 'Copied!' },
  'idColumn.copyToClipboard': {
    defaultMessage: 'Copy to clipboard #{id}',
    params: { id: 'string' },
  },
  'idColumn.truncated': {
    defaultMessage: '#{id}...',
    params: { id: 'string' },
  },

  'variantSelector.placeholder': { defaultMessage: 'Select variant' },
  'variantSelector.defaultLabel': {
    defaultMessage: 'Default · {label}',
    params: { label: 'string' },
  },

  'breadcrumb.more': { defaultMessage: 'More' },
  'sidebar.mobileTitle': { defaultMessage: 'Sidebar' },
  'sidebar.mobileDescription': {
    defaultMessage: 'Displays the mobile sidebar.',
  },

  'tour.previous': { defaultMessage: 'Previous' },
  'tour.next': { defaultMessage: 'Next' },
  'tour.finish': { defaultMessage: 'Finish' },
  'tour.close': { defaultMessage: 'Close tour' },
  'tour.previousStep': { defaultMessage: 'Previous step' },
  'tour.nextStep': { defaultMessage: 'Next step' },

  'navMain.groupLabel': {
    defaultMessage: '{label} ({count})',
    params: { label: 'string', count: 'number' },
  },
} as const satisfies Record<string, ManagerMessageDefinition>

export type ManagerMessageKey = keyof typeof managerMessages
