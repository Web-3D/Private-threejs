interface UseHookNameParams {
  speed?: number
}

interface UseHookNameReturn {
  value: number
}

export function useHookName(_params: UseHookNameParams = {}): UseHookNameReturn {
  // implement here
  return { value: 0 }
}
