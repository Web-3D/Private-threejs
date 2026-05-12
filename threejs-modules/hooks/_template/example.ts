import { useHookName } from './index'

// Minimal example — copy và đổi useHookName thành tên hook thật
export function HookExample() {
  const value = useHookName()
  console.log('[example]', value)
  return value
}
