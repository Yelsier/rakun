export type ManagerMessageParamSpec = 'string' | 'number' | 'boolean' | readonly string[]

export type ManagerMessageDefinition = {
  defaultMessage: string
  params?: Record<string, ManagerMessageParamSpec>
}

export const MANAGER_CATALOG_VERSION = 1

export const managerMessages = {
  'brand.name': { defaultMessage: 'CMS' },
  'brand.tagline': { defaultMessage: 'Enterprise' },

  'navUser.account': { defaultMessage: 'Account' },
  'navUser.logOut': { defaultMessage: 'Log out' },
  'navUser.language': { defaultMessage: 'Languages' },
  'navUser.theme.light': { defaultMessage: 'Light' },
  'navUser.theme.dark': { defaultMessage: 'Dark' },

  'sidebar.mediaLibrary': { defaultMessage: 'Media Library' },
  'sidebar.users': { defaultMessage: 'Users' },
  'sidebar.apiRoutes': { defaultMessage: 'API Routes' },
  'sidebar.settings': { defaultMessage: 'Settings' },
  'sidebar.help': { defaultMessage: 'Help' },
  'sidebar.plugins': { defaultMessage: 'Plugins' },
  'sidebar.contentTypes': { defaultMessage: 'Content types' },

  'nav.dashboard': { defaultMessage: 'Dashboard' },
  'nav.toggleSidebar': { defaultMessage: 'Toggle Sidebar' },

  'login.brand': { defaultMessage: 'Acme Inc.' },
  'login.welcome': { defaultMessage: 'Welcome to Acme Inc.' },
  'login.email': { defaultMessage: 'Email' },
  'login.password': { defaultMessage: 'Password' },
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
  'settings.userRoles': { defaultMessage: 'User Roles' },
  'settings.literals': { defaultMessage: 'Literals' },
  'settings.redirects': { defaultMessage: 'Redirects' },
  'settings.robots': { defaultMessage: 'Robots' },
  'settings.seo': { defaultMessage: 'SEO' },
  'settings.logs': { defaultMessage: 'Logs' },
  'settings.logs.description': {
    defaultMessage:
      'Inspect persistent system events and narrow them by type, result, source, tags or date.',
  },
  'settings.logs.type': { defaultMessage: 'Event type' },
  'settings.logs.category': { defaultMessage: 'Category' },
  'settings.logs.outcome': { defaultMessage: 'Outcome' },
  'settings.logs.severity': { defaultMessage: 'Severity' },
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

  'common.cancel': { defaultMessage: 'Cancel' },
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
  'contentEdit.tabSeo': { defaultMessage: 'Seo' },
  'contentEdit.tabVariants': { defaultMessage: 'Variants' },
  'contentEdit.tabHistory': { defaultMessage: 'History' },
  'contentEdit.saveAsDraft': { defaultMessage: 'Save as draft' },
  'contentEdit.saveOptions': { defaultMessage: 'Save options' },
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
    defaultMessage: 'Translate supported fields and save the document.',
  },
  'contentEdit.requiredField': { defaultMessage: 'Required field' },
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
  'contentEdit.updating': { defaultMessage: 'Updating' },
  'contentEdit.updatePreview': { defaultMessage: 'Update preview' },
  'contentEdit.selectModule': { defaultMessage: 'Select module' },
  'contentEdit.openLargePreview': { defaultMessage: 'Open large preview' },
  'contentEdit.closeLargePreview': { defaultMessage: 'Close large preview' },
  'contentEdit.loadingPreview': { defaultMessage: 'Loading preview' },
  'contentEdit.previewCouldNotLoad': {
    defaultMessage: 'Preview could not be loaded',
  },
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
  'contentEdit.addExisting': { defaultMessage: 'Add existing' },
  'contentEdit.addNew': { defaultMessage: 'Add new' },
  'contentEdit.createQuoted': {
    defaultMessage: 'Create "{query}"',
    params: { query: 'string' },
  },
  'contentEdit.invalidNumber': { defaultMessage: 'Invalid number' },
  'contentEdit.selectAnOption': { defaultMessage: 'Select an option' },
  'contentEdit.reorderMedia': { defaultMessage: 'Reorder media' },
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
  'dynamicData.field': { defaultMessage: 'Field' },
  'dynamicData.mappingMode': { defaultMessage: 'Mapping mode' },
  'dynamicData.directField': { defaultMessage: 'Direct field' },
  'dynamicData.relatedCollection': { defaultMessage: 'Related collection' },
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
    defaultMessage: 'Recovery codes are single-use and replace your usual MFA method for this login.',
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
