import { useRef } from 'react'
import { RelationNewDefaultData } from '@rakun-kit/core/lib/fields/Relation'

import type { RelationPropsRef } from '.'
import type { FieldRef } from '../../ContentTypeEdit'
import ContentTypeEdit from '../../ContentTypeEdit'
import { FieldWrapper } from '../shared/FieldWrapper'
import { FieldValue } from '../shared'

const NewRelation: React.FC<RelationPropsRef> = ({ ref, ...props }) => {
  const innerRef = useRef<FieldRef>(null)

  const getValue = () => ({
    type: 'new',
    data: innerRef.current?.getValue() as object,
  })

  const getState = () => ({
    type: 'new',
    data: innerRef.current?.getState() as object,
  })

  return (
    <FieldWrapper
      id={props.id}
      errors={[]}
      getState={getState}
      getValue={getValue}
      ref={ref}
    >
      <ContentTypeEdit
        defaultData={
          (
            props.defaultData as RelationNewDefaultData<{
              [key: string]: FieldValue
            }>
          )?.data
        }
        id={props.id}
        ref={innerRef}
        contentType={props.contentType}
        collapsible={props.collapsible}
      />
    </FieldWrapper>
  )
}

export default NewRelation
