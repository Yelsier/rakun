const MissingUI: React.FC<{ field: { type: string; ui: string } }> = ({ field }) => {
  return (
    <div>
      Field UI {field.ui} Type {field.type} is missing.
    </div>
  )
}
export default MissingUI
