import { ApiEventEntry, ApiEventEntryInput, UserRoles } from '@ping-board/common'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import { Button, Container } from 'react-bootstrap'
import { Navigate, useMatch } from 'react-router-dom'
import {
  useAddEventMutation,
  useDeleteEventMutation,
  useGetUserQuery,
  useUpdateEventMutation,
} from '../store'
import { useEventsList } from '../hooks/use-events-list'
import { EditEventDialog } from '../components/edit-event-dialog'
import { EventsTable } from '../components/events-table'
import './timers.scss'

export function TimersPage(): JSX.Element {
  const me = useGetUserQuery()

  const canEdit = me.data?.isLoggedIn && me.data.character.roles.includes(UserRoles.EVENTS_EDIT)
  const canAdd = canEdit || (
    me.data?.isLoggedIn && me.data.character.roles.includes(UserRoles.EVENTS_ADD)
  )
  const canRead = me.data?.isLoggedIn && me.data.character.roles.includes(UserRoles.EVENTS_READ)

  const eventsList = useEventsList({ skip: me.isLoading || !canRead })
  const upcomingThreshold = Date.now() + 1000 * 60 * 60
  const pastThreshold = Date.now() - 1000 * 60 * 60
  const upcomingEvents = eventsList.events.filter(e => dayjs(e.time).valueOf() > upcomingThreshold)
  const pastEvents = eventsList.events.filter(e => dayjs(e.time).valueOf() < pastThreshold)
  const activeEvents = eventsList.events.filter(e => {
    const t = dayjs(e.time).valueOf()
    return t <= upcomingThreshold && t >= pastThreshold
  })

  const [addEvent, addEventState] = useAddEventMutation()
  const [updateEvent, updateEventState] = useUpdateEventMutation()
  const [deleteEvent, deleteEventState] = useDeleteEventMutation()

  const [saveState, setSaveState] = useState<'add' | 'edit' | 'delete' | null>(null)
  const isSaving = !!saveState
  useEffect(() => {
    let state: (typeof addEventState) | (typeof updateEventState) | (typeof deleteEventState)
    switch (saveState) {
      case 'add':    state = addEventState; break
      case 'edit':   state = updateEventState; break
      case 'delete': state = deleteEventState; break
      default: return
    }
    if (!state.isLoading) {
      if (state.isError) {
        console.log('An Error occurred trying to', saveState, 'an event', state.error)
      }
      setSaveState(null)
    }
  }, [addEventState, deleteEventState, eventsList, saveState, updateEventState])

  const [eventDialogState, setEventDialogState] = useState({
    event: null as ApiEventEntry | null,
    show: false,
  })

  const editEvent = (event: ApiEventEntry) => setEventDialogState({ event, show: true })
  const addNewEvent = () => setEventDialogState({ event: null, show: true })
  const cancelEdit = () => setEventDialogState({ event: null, show: false })
  const confirmEditEvent = (event: ApiEventEntryInput) => {
    if (!eventDialogState.event) {
      setSaveState('add')
      addEvent(event)
    } else {
      setSaveState('edit')
      updateEvent({ id: eventDialogState.event.id, event })
    }
    cancelEdit()
  }
  const deleteEditedEvent = () => {
    const { event } = eventDialogState
    if (!event) {
      return
    }
    setSaveState('delete')
    deleteEvent(event.id)
    cancelEdit()
  }

  const match = useMatch('')
  if (!me.isFetching) {
    if (!me.data?.isLoggedIn) {
      return <Navigate to={`/login?postLoginRedirect=${match?.pathname}`} />
    }
    if (!canRead) {
      return (
        <Container fluid>
          <h6>Sorry, you don&apos;t have permission to view this page.</h6>
        </Container>
      )
    }
  }

  return (
    <Container fluid>
      <div className="timers-header">
        <h3>Timers</h3>
        <Button onClick={eventsList.reloadEvents} disabled={isSaving}>
          <i className="bi-arrow-clockwise" /> Reload
        </Button>
        <div style={{ flex: 1 }} />
        {canAdd &&
          <Button onClick={addNewEvent} disabled={isSaving}>
            <i className="bi-calendar-plus" /> New Event
          </Button>
        }
      </div>

      {upcomingEvents.length > 0 && (<>
        <h4>Upcoming</h4>

        <EventsTable
          events={upcomingEvents}
          showResultColumn
          canEdit={canEdit}
          onEdit={editEvent}
        />
      </>)}

      {activeEvents.length > 0 && (<>
        <h4>Active</h4>

        <EventsTable
          events={activeEvents}
          showResultColumn
          canEdit={canEdit}
          onEdit={editEvent}
        />
      </>)}

      {pastEvents.length > 0 && (<>
        <h4>Past</h4>

        <EventsTable
          events={pastEvents}
          showResultColumn
          canEdit={canEdit}
          onEdit={editEvent}
        />
      </>)}

      <Button
        className="w-100 mb-3"
        disabled={!eventsList.hasMoreEvents || eventsList.loading || isSaving}
        onClick={eventsList.loadMoreEvents}
      >
        {eventsList.loading
          ? 'Loading…'
          : eventsList.hasMoreEvents
            ? 'Load more'
            : '(No more events)'
        }
      </Button>

      <EditEventDialog
        show={eventDialogState.show}
        event={eventDialogState.event}
        onCancel={cancelEdit}
        onSave={confirmEditEvent}
        onDelete={deleteEditedEvent}
      />
    </Container>
  )
}
