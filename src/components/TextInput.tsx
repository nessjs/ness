import React from 'react'
import { Box, Text, useFocus } from 'ink'
import InkTextInput from 'ink-text-input'
import { extractProps } from '../utils/react'

type InkTextInputProps = extractProps<typeof InkTextInput>
type TextInputProps = InkTextInputProps & {
  name: string
  prefix?: string
  autoFocus?: boolean
}

export const TextInput: React.FunctionComponent<TextInputProps> = (props: TextInputProps) => {
  const { prefix, name, autoFocus, mask, value } = props
  const { isFocused } = useFocus({
    autoFocus,
  })
  const current = () => {
    if (mask && value) {
      return value.replace(/./g, mask)
    } else {
      return value
    }
  }
  return (
    <Box flexDirection='row'>
      {prefix && <Text>{prefix}</Text>}
      <Text dimColor={!isFocused}>{name}: </Text>
      {isFocused ? (
        <InkTextInput {...props} showCursor />
      ) : (
        <Text dimColor={!isFocused}>{current()}</Text>
      )}
    </Box>
  )
}
