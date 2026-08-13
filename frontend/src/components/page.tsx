import { Link } from '@tanstack/react-router'
import Banner from '@douyinfe/semi-ui/lib/es/banner'
import Button from '@douyinfe/semi-ui/lib/es/button'
import Empty from '@douyinfe/semi-ui/lib/es/empty'
import Spin from '@douyinfe/semi-ui/lib/es/spin'
import Typography from '@douyinfe/semi-ui/lib/es/typography'
import { IconPlus } from '@douyinfe/semi-icons'
import { m } from '../paraglide/messages.js'

const { Title, Text } = Typography

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: { label: string; to: string }
}) {
  return (
    <header className="page-header">
      <div>
        <Title heading={1}>{title}</Title>
        {description && <Text type="tertiary">{description}</Text>}
      </div>
      {action && (
        <Link to={action.to}>
          <Button theme="solid" type="primary" icon={<IconPlus />}>
            {action.label}
          </Button>
        </Link>
      )}
    </header>
  )
}

export function LoadingState({ label = m.common_loading() }: { label?: string }) {
  return (
    <div className="state-panel" role="status">
      <Spin tip={label} size="large" />
    </div>
  )
}

export function EmptyState({
  title,
  description,
  icon,
}: {
  title: string
  description?: string
  icon?: React.ReactNode
}) {
  return (
    <Empty
      className="empty-state"
      image={icon ? <span className="empty-state-icon">{icon}</span> : undefined}
      title={title}
      description={description}
    />
  )
}

export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  const message = error instanceof Error ? error.message : m.error_generic()
  return (
    <Banner
      className="state-panel state-error"
      type="danger"
      fullMode={false}
      title={m.error_page_title()}
      description={message}
      closeIcon={null}
    >
      {retry && <Button onClick={retry}>{m.error_try_again()}</Button>}
    </Banner>
  )
}
