export interface IAutor {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  site_admin: false;
}

export interface IAsset {
  url: string;
  id: number;
  node_id: string;
  name: string;
  label: string;
  uploader: {
    login: string;
    id: number;
    node_id: string;
    avatar_url: string;
    gravatar_id: string;
    url: string;
    html_url: string;
    followers_url: string;
    following_url: string;
    gists_url: string;
    starred_url: string;
    subscriptions_url: string;
    organizations_url: string;
    repos_url: string;
    events_url: string;
    received_events_url: string;
    type: string;
    site_admin: false;
  };
  content_type: string;
  state: string;
  size: number;
  download_count: 223;
  created_at: string;
  updated_at: string;
  browser_download_url: string;
}

export interface IRelease {
  url: string;
  assets_url: string;
  upload_url: string;
  html_url: string;
  id: number;
  author: IAutor;
  node_id: string;
  tag_name: string;
  target_commitish: string;
  name: string;
  draft: false;
  prerelease: false;
  created_at: string;
  published_at: string;
  assets: IAsset[];
  tarball_url: string;
  zipball_url: string;
  body: string;
  reactions: {
    url: string;
    total_count: number;
    "+1": number;
    "-1": number;
    laugh: number;
    hooray: 1;
    confused: number;
    heart: number;
    rocket: number;
    eyes: number;
  };
}
