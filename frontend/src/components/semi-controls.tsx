import Button from '@douyinfe/semi-ui/lib/es/button'
import Checkbox from '@douyinfe/semi-ui/lib/es/checkbox'
import Input from '@douyinfe/semi-ui/lib/es/input'
import TextArea from '@douyinfe/semi-ui/lib/es/input/textarea'
import Select from '@douyinfe/semi-ui/lib/es/select'
import Switch from '@douyinfe/semi-ui/lib/es/switch'
import type { ButtonProps } from '@douyinfe/semi-ui/lib/es/button'
import type { CheckboxProps } from '@douyinfe/semi-ui/lib/es/checkbox'
import type { InputProps } from '@douyinfe/semi-ui/lib/es/input'
import type { TextAreaProps } from '@douyinfe/semi-ui/lib/es/input/textarea'
import type { SelectProps } from '@douyinfe/semi-ui/lib/es/select'
import {
  Children,
  forwardRef,
  isValidElement,
  type ButtonHTMLAttributes,
  type ChangeEvent,
  type ReactElement,
  type ReactNode,
} from 'react'

type TextInputProps = Omit<InputProps, 'onChange'> & {
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { onChange, ...props },
  ref,
) {
  return <Input {...props} ref={ref} onChange={(_value, event) => onChange?.(event)} />
})

export function TextAreaInput({
  onChange,
  ...props
}: Omit<TextAreaProps, 'onChange'> & {
  onChange?: (event: ChangeEvent<HTMLTextAreaElement>) => void
}) {
  return (
    <TextArea
      {...props}
      onChange={(_value, event) => onChange?.(event as unknown as ChangeEvent<HTMLTextAreaElement>)}
    />
  )
}

type OptionElement = ReactElement<{
  children?: ReactNode
  disabled?: boolean
  value?: string | number
}>

export function SelectInput({
  children,
  multiple,
  onChange,
  value,
  ...props
}: Omit<SelectProps, 'children' | 'onChange' | 'optionList'> & {
  children?: ReactNode
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void
}) {
  const optionList = Children.toArray(children)
    .filter((child): child is OptionElement => isValidElement(child) && child.type === 'option')
    .map((option) => ({
      label: option.props.children,
      value: option.props.value ?? '',
      disabled: option.props.disabled,
    }))

  return (
    <Select
      {...props}
      multiple={multiple}
      value={value}
      optionList={optionList}
      onChange={(nextValue) => {
        const values = Array.isArray(nextValue) ? nextValue.map(String) : [String(nextValue ?? '')]
        const target = {
          value: values[0] ?? '',
          selectedOptions: values.map((item) => ({ value: item })),
        }
        onChange?.({ target, currentTarget: target } as unknown as ChangeEvent<HTMLSelectElement>)
      }}
    />
  )
}

export function CheckInput({
  children,
  onChange,
  type: _type,
  ...props
}: Omit<CheckboxProps, 'children' | 'onChange' | 'type'> & {
  children?: ReactNode
  type?: 'checkbox'
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void
}) {
  void _type
  return (
    <Checkbox
      {...props}
      onChange={(event) => onChange?.(event as unknown as ChangeEvent<HTMLInputElement>)}
    >
      {children}
    </Checkbox>
  )
}

export function Toggle({
  checked,
  disabled,
  onChange,
  ...props
}: {
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
  'aria-label'?: string
  id?: string
}) {
  return (
    <Switch
      {...props}
      checked={checked}
      disabled={disabled}
      onChange={(nextChecked) => onChange(nextChecked)}
    />
  )
}

type NativeButtonType = ButtonHTMLAttributes<HTMLButtonElement>['type']
type ActionButtonProps = Omit<ButtonProps, 'htmlType' | 'type'> & {
  type?: NativeButtonType
  children?: ReactNode
}

export function ActionButton({
  className = '',
  type = 'button',
  children,
  ...props
}: ActionButtonProps) {
  const primary = className.includes('button-primary')
  const danger = className.includes('danger-button')
  const borderless =
    className.includes('icon-button') ||
    className.includes('nav-button') ||
    className.includes('sidebar-backdrop') ||
    className.includes('user-button')

  return (
    <Button
      {...props}
      className={className}
      htmlType={type}
      theme={primary ? 'solid' : borderless ? 'borderless' : 'light'}
      type={danger ? 'danger' : primary ? 'primary' : 'tertiary'}
    >
      {children}
    </Button>
  )
}
