export type SimpleListItem<Value> = {
  uid: string
  value: Value
}

export const snapshotSimpleListOrder = <Value>(
  items: SimpleListItem<Value>[],
  getState: (uid: string) => Value | undefined,
) =>
  items.map((item) => ({
    uid: item.uid,
    value: getState(item.uid) ?? item.value,
  }))
