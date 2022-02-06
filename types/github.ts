export interface CommitHistory {
  data: Data;
}

export interface Data {
  repository: Repository;
}

export interface Repository {
  ref: Ref;
}

export interface Ref {
  name: string;
  target: Target;
}

export interface Target {
  history: History;
}

export interface History {
  edges: Edge[];
}

export interface Edge {
  node: Node;
}

export interface Node {
  abbreviatedOid: string;
  message: string;
  author: Author;
}

export interface Author {
  avatarUrl: string;
  name: string;
}
