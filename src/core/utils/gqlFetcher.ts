import { request } from 'graphql-request';

export default async function gqlFetcher<JSON>(
  url: string,
  query?: string,
): Promise<JSON> {
  // const res = await fetch(input, init);
  return await request<JSON>(url, query);
}
