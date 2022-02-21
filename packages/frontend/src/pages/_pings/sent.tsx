import { useState } from 'react'
import { Alert, Button, Col, Container, Row, Table } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { ApiPing, UserRoles } from '@ping-board/common'
import { Time } from '../../components/time'
import { PingDetailDialog } from '../../components/ping-detail-dialog'
import { useGetUserQuery } from '../../store'
import { usePingsList } from '../../hooks'
import './sent.scss'

export function SentPings(): JSX.Element {
  const me = useGetUserQuery()

  const canRead = me.data?.isLoggedIn && me.data?.character.roles.includes(UserRoles.PING)
  const canEdit = me.data?.isLoggedIn &&
    me.data.character.roles.includes(UserRoles.PING_TEMPLATES_WRITE)

  const pings = usePingsList({ skip: me.isLoading || !canRead })

  const [showPingDialog, setShowPingDialog] = useState(false)
  const [displayedPing, setDisplayedPing] = useState<ApiPing | null>(null)

  const handlePingClicked = (ping: ApiPing) => {
    setDisplayedPing(ping)
    setShowPingDialog(true)
  }
  const handleClosePingDialog = () => {
    setShowPingDialog(false)
  }

  return (
    <Container>
      <div className="sent-pings-header">
        <h3>Sent Pings</h3>
        <Button onClick={pings.reload} disabled={pings.loading}>
          <i className="bi-arrow-clockwise" /> Reload
        </Button>
        <div style={{ flex: 1 }} />
        <Link to=".." className="btn btn-primary" role="button">
          <i className="bi-arrow-left" /> Back to Pings
        </Link>
        {canEdit &&
          <Link to="../view-access" className="btn btn-primary" role="button">
            <i className="bi-wrench" /> Manage View Access
          </Link>
        }
      </div>
      <Row>
        <Col xs={12}>
          <Alert variant="info" className="py-2">
            These Pings were either sent by you, or were sent to channels you have view access to.
            View access is determined by your Neucore groups, not which Slack channels you are in.
          </Alert>
        </Col>
        <Col xs={12}>
          <Table hover size="sm" variant="dark" responsive className="sent-pings-table">
            <thead>
              <tr>
                <th>Author</th>
                <th>Sent at</th>
                <th>Sent to</th>
                <th>Text</th>
              </tr>
            </thead>
            <tbody>
              {pings.pings.length < 1 &&
                <tr>
                  <td colSpan={4}>No Pings to show</td>
                </tr>
              }
              {pings.pings.map(p => (
                <tr key={p.id} onClick={() => handlePingClicked(p)}>
                  <td>{p.author}</td>
                  <td><Time time={p.sentAt} format="YYYY-MM-DD HH:mm" /></td>
                  <td>{p.slackChannelName}</td>
                  <td className="text-cell">
                    <div title={p.text}>
                      {p.text}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          <Button
            className="w-100 mb-3"
            disabled={!pings.hasMore || pings.loading}
            onClick={pings.loadMore}
          >
            {pings.loading
              ? 'Loading…'
              : pings.hasMore
                ? 'Load more'
                : '(No more pings)'
            }
          </Button>
        </Col>
      </Row>

      <PingDetailDialog
        show={showPingDialog}
        ping={displayedPing}
        onHide={handleClosePingDialog}
        fullscreen="sm-down"
      />
    </Container>
  )
}
