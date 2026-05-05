import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const IDColumn: React.FC<{ _id: string }> = ({ _id }) => {
  const [copiedID, setCopiedID] = useState(false)
  const [open, setOpen] = useState(false)

  return (
    <Tooltip open={open}>
      <TooltipTrigger asChild>
        <Button
          onClick={() => {
            navigator.clipboard.writeText(_id)
            setCopiedID(true)
          }}
          className="cursor-pointer w-[115px] justify-start"
          variant="outline"
          onMouseOver={() => setOpen(true)}
          onMouseOut={() => {
            setOpen(false)
            setTimeout(() => setCopiedID(false), 500)
          }}
        >
          #{_id.slice(0, 6)}...
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{copiedID ? 'Copied!' : `Copy to clipboard #${_id}`}</p>
      </TooltipContent>
    </Tooltip>
  )
}
export default IDColumn
