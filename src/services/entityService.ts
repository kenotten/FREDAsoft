import { firestoreService } from './firestoreService';
import { toast } from 'sonner';
import { Client, Facility, Project, Inspector } from '../types';

export const entityService = {
  handleEditClient: (client: Client, setEditingClient: (c: Client) => void, setIsAddingClient: (b: boolean) => void) => {
    setEditingClient(client);
    setIsAddingClient(true);
  },

  handleEditFacility: (facility: Facility, setEditingFacility: (f: Facility) => void, setIsAddingFacility: (b: boolean) => void) => {
    setEditingFacility(facility);
    setIsAddingFacility(true);
  },

  handleEditProject: (project: Project, setEditingProject: (p: Project) => void, setIsAddingProject: (b: boolean) => void) => {
    setEditingProject(project);
    setIsAddingProject(true);
  },

  handleEditInspector: (inspector: Inspector, setEditingInspector: (i: Inspector) => void, setIsAddingInspector: (b: boolean) => void) => {
    setEditingInspector(inspector);
    setIsAddingInspector(true);
  },

  initiateDelete: (
    type: 'client' | 'facility' | 'project' | 'inspector',
    id: string,
    entities: { clients: Client[], facilities: Facility[], projects: Project[], inspectors: Inspector[] },
    setDeleteConfirmation: (conf: any) => void,
    selections: any,
    setSelections: (s: any) => void
  ) => {
    const entity = type === 'client' ? entities.clients.find(c => c.fldClientID === id) :
                   type === 'facility' ? entities.facilities.find(f => f.fldFacID === id) :
                   type === 'project' ? entities.projects.find(p => p.fldProjID === id) :
                   entities.inspectors.find(i => i.fldInspID === id);
    
    const name = type === 'client' ? (entity as Client)?.fldClientName :
                 type === 'facility' ? (entity as Facility)?.fldFacName :
                 type === 'project' ? (entity as Project)?.fldProjName :
                 (entity as Inspector)?.fldInspName;

    setDeleteConfirmation({
      title: `Delete ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      message: `Are you sure you want to delete "${name}"? This record will be archived but not permanently removed.`,
      onConfirm: async () => {
        try {
          const collectionName = type === 'client' ? 'clients' :
                               type === 'facility' ? 'facilities' :
                               type === 'project' ? 'projects' :
                               'inspectors';
          
          await firestoreService.softDelete(collectionName, id);
          
          toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} archived`);
          
          if (selections.clientId === id || selections.facilityId === id || selections.projectId === id || selections.inspectorId === id) {
             setSelections({ 
               ...selections, 
               clientId: selections.clientId === id ? '' : selections.clientId, 
               facilityId: selections.facilityId === id ? '' : selections.facilityId, 
               projectId: selections.projectId === id ? '' : selections.projectId,
               inspectorId: selections.inspectorId === id ? '' : selections.inspectorId
             });
          }
        } catch (error) {
          toast.error(`Failed to delete ${type}`);
        } finally {
          setDeleteConfirmation(null);
        }
      }
    });
  },

  handleSubmitClient: async (
    e: React.FormEvent<HTMLFormElement>,
    editingClient: Client | null,
    setIsAddingClient: (b: boolean) => void,
    setEditingClient: (c: Client | null) => void
  ) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      fldClientName: formData.get('name'),
      fldClientAddress: formData.get('address'),
      fldClientCity: formData.get('city'),
      fldClientState: formData.get('state'),
      fldClientZIP: formData.get('zip'),
    };
    try {
      await firestoreService.save('clients', data, editingClient?.fldClientID);
      toast.success(editingClient ? 'Client updated' : 'Client added');
      setIsAddingClient(false);
      setEditingClient(null);
    } catch (error) {
      toast.error('Failed to save client');
    }
  },

  handleSubmitFacility: async (
    e: React.FormEvent<HTMLFormElement>,
    editingFacility: Facility | null,
    clientId: string,
    setIsAddingFacility: (b: boolean) => void,
    setEditingFacility: (f: Facility | null) => void
  ) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      fldFacName: formData.get('name'),
      fldFacAddress: formData.get('address'),
      fldFacCity: formData.get('city'),
      fldFacState: formData.get('state'),
      fldFacZip: formData.get('zip'),
      fldInspectionDate: formData.get('inspectionDate'),
      fldClient: editingFacility?.fldClient || clientId
    };
    try {
      await firestoreService.save('facilities', data, editingFacility?.fldFacID);
      toast.success(editingFacility ? 'Facility updated' : 'Facility added');
      setIsAddingFacility(false);
      setEditingFacility(null);
    } catch (error) {
      toast.error('Failed to save facility');
    }
  },

  handleSubmitProject: async (
    e: React.FormEvent<HTMLFormElement>,
    editingProject: Project | null,
    clientId: string,
    setIsAddingProject: (b: boolean) => void,
    setEditingProject: (p: Project | null) => void
  ) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      fldProjName: formData.get('name'),
      fldProjNumber: formData.get('projNumber'),
      fldExternalRef: formData.get('externalRef'),
      fldPDDate: formData.get('date'),
      fldInspector: formData.get('inspector'),
      fldProjType: formData.get('projType'),
      fldProjDescription: formData.get('projDescription'),
      fldClient: formData.get('client') || editingProject?.fldClient || clientId,
      fldFacilities: formData.getAll('facilities')
    };
    try {
      await firestoreService.save('projects', data, editingProject?.fldProjID);
      toast.success(editingProject ? 'Project updated' : 'Project added');
      setIsAddingProject(false);
      setEditingProject(null);
    } catch (error) {
      toast.error('Failed to save project');
    }
  },

  handleSubmitInspector: async (
    e: React.FormEvent<HTMLFormElement>,
    editingInspector: Inspector | null,
    setIsAddingInspector: (b: boolean) => void,
    setEditingInspector: (i: Inspector | null) => void
  ) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      fldInspName: formData.get('name'),
      fldTitle: formData.get('title'),
      fldCredentials: formData.get('credentials'),
    };
    try {
      await firestoreService.save('inspectors', data, editingInspector?.fldInspID);
      toast.success(editingInspector ? 'Inspector updated' : 'Inspector added');
      setIsAddingInspector(false);
      setEditingInspector(null);
    } catch (error) {
      toast.error('Failed to save inspector');
    }
  }
};
