import React, { useState } from 'react'
import { Button, Container, Table } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { ApiPingTemplate, ApiPingTemplateInput } from '@ping-board/common'
import {
  useAddPingTemplateMutation,
  useDeletePingTemplateMutation,
  useGetPingTemplatesQuery,
  useUpdatePingTemplateMutation,
} from '../../store'
import { EditPingTemplateDialog } from '../../components/edit-ping-template-dialog'
import './templates.scss'

export function ManagePingTemplates(): JSX.Element {
  const pingTemplates = useGetPingTemplatesQuery()
  const [addTemplate] = useAddPingTemplateMutation()
  const [updateTemplate] = useUpdatePingTemplateMutation()
  const [deleteTemplate] = useDeletePingTemplateMutation()

  const [templateDialogState, setTemplateDialogState] = useState({
    template: null as ApiPingTemplate | null,
    show: false,
  })
  const editTemplate = (template: ApiPingTemplate) =>
    setTemplateDialogState({ template, show: true })
  const addNewTemplate = () => setTemplateDialogState({ template: null, show: true })
  const cancelEdit = () => setTemplateDialogState({ template: null, show: false })

  const confirmEditTemplate = (template: ApiPingTemplateInput) => {
    if (!templateDialogState.template) {
      addTemplate(template)
    } else {
      updateTemplate({ id: templateDialogState.template.id, template })
    }
    cancelEdit()
  }
  const deleteEditedTemplate = () => {
    const { template } = templateDialogState
    if (!template) {
      return
    }
    deleteTemplate(template.id)
    cancelEdit()
  }

  return (
    <Container>
      <div className="templates-header">
        <h3>Manage Ping Templates</h3>
        <div style={{ flex: 1 }} />
        <Link to=".." className="btn btn-primary" role="button">
          <i className="bi-arrow-left" /> Back to Pings
        </Link>
        <Button onClick={addNewTemplate}>
          <i className="bi-plus-lg" /> Add Ping Template
        </Button>
      </div>
      <Table hover size="sm" variant="dark" responsive>
        <thead>
          <tr>
            <th>Name</th>
            <th>Targeted Channel</th>
            <th>Groups Allowed to Ping</th>
            <th>Calendar Support</th>
            <th>Template</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {pingTemplates.isFetching &&
            <tr>
              <td colSpan={5}>Loading&elipsis;</td>
            </tr>
          }
          {!pingTemplates.isFetching && (pingTemplates.data?.templates.length ?? 0) < 1 &&
            <tr>
              <td colSpan={5}>No ping templates defined</td>
            </tr>
          }
          {pingTemplates.data?.templates.map(t => (
            <tr key={t.id}>
              <th scope="row">{t.name}</th>
              <td>{t.slackChannelName}</td>
              <td>
                {t.allowedNeucoreGroups.length < 1
                  ? <i>(Everyone)</i>
                  : t.allowedNeucoreGroups.join(', ')
                }
              </td>
              <td>{t.allowScheduling ? 'Yes' : 'No'}</td>
              <td>
                {t.template.split('\n').map((line, i) => (
                  <React.Fragment key={i}>{line}<br /></React.Fragment>
                ))}
              </td>
              <td>
                <Button size="sm" onClick={() => editTemplate(t)}>
                  <i className="bi-pencil" /> Edit
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <EditPingTemplateDialog
        show={templateDialogState.show}
        template={templateDialogState.template}
        onCancel={cancelEdit}
        onSave={confirmEditTemplate}
        onDelete={deleteEditedTemplate}
      />
    </Container>
  )
}
