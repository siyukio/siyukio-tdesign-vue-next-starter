import { postRequestWithAuth } from '@/utils/mcp';

export const Api = {
  Me: '/user/me',
};

export interface UserResponse {
  id: string;
  nickname: string;
  roles: string[];
}

export const me = async () => {
  return await postRequestWithAuth<UserResponse>(Api.Me, {});
};
