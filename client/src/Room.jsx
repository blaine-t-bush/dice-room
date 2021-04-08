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

const MESSAGE_CREATED = gql`
  subscription messageCreated {
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

function Users() {
  const { loading, error, data } = useQuery(GET_USERS);

  if (loading) return 'Loading...';
  if (error) return `Error! ${error.message}`;

  return (
    <ul>
      {data.users.map(({id, name}) => { return (
        <li key={id}>
          {name}
        </li>
      )})}
    </ul>
  );
}

class MessagesPage extends React.Component {
  componentDidMount() {
    this.props.subscribeToNewMessages();
  }

  render() {
    return (
      <ul>
        {this.props.messages.map(({id, user, text}) => { return (
          <li key={id} className="message">
            <div className="message-username">{user.name}</div>
            <div className="message-text">{text}</div>
          </li>
        )})}
      </ul>
    );
  }
}

function Messages() {
  const { loading, error, data, subscribeToMore } = useQuery(GET_MESSAGES);

  if (loading) return 'Loading...';
  if (error) return `Error! ${error.message}`;

  return (
    <MessagesPage
      messages={data.messages}
      subscribeToNewMessages={() =>
        subscribeToMore({
          document: MESSAGE_CREATED,
          updateQuery: (prev, { subscriptionData }) => {
            if (!subscriptionData.data) return prev;
            const newMessage = subscriptionData.data.messageCreated;
            return Object.assign({}, prev, {
              messages: [...prev.messages, newMessage]
            })
          }
        })
      }
    />
  );
}

function Room() {
  const [createMessage] = useMutation(CREATE_MESSAGE);
  const [state, stateSet] = React.useState({
    user: {
      id: 0,
      name: "Guest",
    },
    text: '',
  });

  // Function for handling sending of new messages.
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
      </ul>
    </div>
  )
};

export default () => (
  <ApolloProvider client={client}>
    <Room />
  </ApolloProvider>
);