const MissingUI: React.FC<{
  field: { type: string; ui: string; editor?: string }
}> = ({ field }) => {
  return (
    <div>
      {field.editor
        ? `Field editor ${field.editor} is missing.`
        : `Field UI ${field.ui} Type ${field.type} is missing.`}
    </div>
  )
}
export default MissingUI
