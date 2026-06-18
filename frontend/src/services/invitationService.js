import api from '../utils/api';

export const getMyInvitations = async () => {
  const { data } = await api.get('/invitations/my');
  return data;
};