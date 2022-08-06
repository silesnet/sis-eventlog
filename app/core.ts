declare const tag: unique symbol;
declare type Tagged<Token> = {
  [tag]: Token;
};

export type Opaque<Type, Token = unknown> = Type & Tagged<Token>;
