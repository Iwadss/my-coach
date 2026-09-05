// Re-exported from src/components/shared/ui.tsx, which is now the single
// definition shared across Admin, Coach and Client. Kept as a thin shim so
// every existing `from '@/components/admin/admin-ui'` import in this
// section keeps working unchanged — import from '@/components/shared/ui'
// directly in new code instead.
export * from '@/components/shared/ui'
