import React from 'react';
import { 
  ApolloClient,
  ApolloProvider,
  HttpLink,
  split,
  InMemoryCache, 
  gql,
  useQuery,
  useMutation,
  useSubscription,
} from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { getMainDefinition } from '@apollo/client/utilities';
import { WebSocketLink } from '@apollo/client/link/ws';

// Build error-catching system.
const errorLink = onError(({ graphQLErrors, networkError }) => {
  // TODO test graphqlErrors catching.
  if (graphQLErrors) {
    graphQLErrors.map(({ message }) => console.log(message));
  }

  // TODO test networkErrors catching.
  if (networkError) {
    networkError.map(({ message }) => console.log(message));
  }
});

// Build HTTP link to server.
const httpLink = new HttpLink({
  uri: 'http://localhost:4000/graphql'
});

// Build WebSocket link to server.
const wsLink = new WebSocketLink({
  uri: 'ws://localhost:4000/subscriptions',
  options: {
    reconnect: true
  }
});

// Split link. This ensures we use the HTTP link for queries and mutations and the WebSocket link for subscriptions,
// based on a bit of logic.
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  httpLink,
);

const client = new ApolloClient({
  link: splitLink,
  // uri: 'http://localhost:4000/graphql',
  cache: new InMemoryCache()
});

// Define React hooks for interacting with GraphQL API.
const GET_USERS = gql`
  query getUsers {
    users {
      id
      name
    }
}
`;

const GET_MESSAGES = gql`
  query getMessages {
    messages {
      id
      user {
        id
        name
      }
      text
    }
  }
`;

const CREATE_MESSAGE = gql`
  mutation createMessage($userId: ID!, $text: String!) {
    createMessage(userId: $userId, text: $text) {
      id
      user {
        id
        name
      }
      text
    }
  }
`;

const WATCH_MESSAGES = gql`
  subscription watchMessages {
    messageCreated {
      id
      user {
        id
        name
      }
      text
    }
  }
`;

const GET_ROLLS = gql`
  query getRolls {
    rolls {
      id
      user {
        id
        name
      }
      diceCount
      diceFaces
      result
    }
  }
`;

const Users = () => {
  const { data } = useQuery(GET_USERS);

  if (!data) {
    return null;
  }

  return (
    <ul>
      {data.users.map(({id, name}) => { return (
        <li key={id}>
          {name}
        </li>
      )})}
    </ul>
  );
};

const Messages = () => {
  const { data } = useQuery(GET_MESSAGES);

  if (!data) {
    return null;
  }

  return (
    <>
      {data.messages.map(({id, user, text}) => { return (
        <li key={id} className="message">
          <div className="message-username">{user.name}</div>
          <div className="message-text">{text}</div>
        </li>
      )})}
    </>
  );
};

const NewMessages = () => {
  const { data } = useSubscription(WATCH_MESSAGES);

  if (!data) {
    return null;
  }

  return (
    <li className="message">
      <div className="message-username">{data.messageCreated.user.name}</div>
      <div className="message-text">{data.messageCreated.text}</div>
    </li>
  );
}

const Rolls = () => {
  const { data } = useQuery(GET_ROLLS);

  if (!data) {
    return null;
  }

  return (
    <ul>
      {data.rolls.map(({id, user, diceCount, diceFaces, result}) => { return (
        <li key={id}>
          <div>{user.name}</div>
          <div>{diceCount}d{diceFaces} &#8594; <span>{result}</span></div>
        </li>
      )})}
    </ul>
  );
};

const Room = () => {
  const [createMessage] = useMutation(CREATE_MESSAGE);
  // const [createUser] = useMutation(CREATE_USER);
  const [state, stateSet] = React.useState({
    user: {
      id: 0,
      name: "Blaine",
    },
    text: '',
  }); // FIXME await response from createUser to set state values.

  const onSend = () => {
    if (state.text.length > 0) {
      try {
        createMessage({
          variables: { userId: state.user.id, text: state.text },
        });
      } catch (e) {
        console.log(e);
      }
    }

    stateSet({
      ...state,
      text: '',
    });
  }

  return (
    <div>
      <input
        type="text"
        name="username"
        id="username"
        value={state.user.name}
        onChange={(e) => stateSet({
          ...state,
          user: {
            id: state.user.id,
            name: e.target.value,
          }
        })} />

      <h1>Users</h1>
      <Users />

      <input
        type="text"
        name="text"
        id="text"
        value={state.text}
        onChange={(e) => stateSet({
            ...state,
            text: e.target.value,
          })
        }
        onKeyDown={(e) => {
          if (e.keyCode === 13) {
            onSend();
          }
        }} />

      <button
        onClick={() => onSend()}>
          Send
        </button>

      <h1>Messages</h1>
      <ul>
        <Messages />
        <NewMessages />
      </ul>

      <h1>Rolls</h1>
      <Rolls />
    </div>
  )
};

export default () => (
  <ApolloProvider client={client}>
    <Room />
  </ApolloProvider>
);