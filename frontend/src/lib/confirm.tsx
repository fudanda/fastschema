import Modal from '@douyinfe/semi-ui/lib/es/modal'
import { useEffect, useRef, useState } from 'react'
import { m } from '../paraglide/messages.js'

type ConfirmRequest = {
  content: string
  resolve: (accepted: boolean) => void
}

let showConfirm: ((request: ConfirmRequest) => void) | undefined

export function confirmDanger(content: string) {
  return new Promise<boolean>((resolve) => {
    if (!showConfirm) {
      resolve(false)
      return
    }
    showConfirm({ content, resolve })
  })
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<ConfirmRequest>()
  const [visible, setVisible] = useState(false)
  const result = useRef(false)

  useEffect(() => {
    showConfirm = (nextRequest) => {
      result.current = false
      setRequest(nextRequest)
      setVisible(true)
    }
    return () => {
      showConfirm = undefined
    }
  }, [])

  const close = (accepted: boolean) => {
    result.current = accepted
    setVisible(false)
  }

  return (
    <>
      {children}
      <Modal
        visible={visible}
        title={m.common_confirm()}
        okText={m.common_delete()}
        cancelText={m.common_cancel()}
        okType="danger"
        okButtonProps={{ 'aria-label': 'confirm' }}
        onOk={() => close(true)}
        onCancel={() => close(false)}
        afterClose={() => {
          const pendingRequest = request
          setRequest(undefined)
          pendingRequest?.resolve(result.current)
        }}
      >
        {request?.content}
      </Modal>
    </>
  )
}
