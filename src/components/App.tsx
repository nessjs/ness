import React, {useState} from 'react'
import {NessContext, NessContextProps} from '../context'
import {Settings} from './Settings'

type Props = {
  initial: NessContextProps
}

export const App: React.FunctionComponent<Props> = ({
  children,
  initial,
}: React.PropsWithChildren<Props>) => {
  const [context, setContext] = useState<NessContextProps>(initial)

  return (
    <NessContext.Provider value={{...context, setContext}}>
      <Settings>{children}</Settings>
    </NessContext.Provider>
  )
}
