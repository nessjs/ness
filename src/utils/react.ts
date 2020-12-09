import React from 'react'

export type extractProps<Type> = Type extends React.FunctionComponent<infer X> ? X : never
