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

const CREATE_USER = gql`
mutation createUser($name: String!) {
  createUser(name: $name) {
    id
    name
  }
}
`;

const USER_CREATED = gql`
  subscription userCreated {
    userCreated {
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

class Users extends React.Component {
  componentDidMount() {
    this.props.subscribeToNewUsers();
  }

  render() {
    return (
      <ul>
        {this.props.users.map(({id, name}) => { return (
          <li key={id}>
            {name}
          </li>
        )})}
      </ul>
    );
  }
}

function UserLoader() {
  const { loading, error, data, subscribeToMore } = useQuery(GET_USERS);

  if (loading) return 'Loading...';
  if (error) return `Error! ${error.message}`;

  return (
    <Users
      users={data.users}
      subscribeToNewUsers={() =>
        subscribeToMore({
          document: USER_CREATED,
          updateQuery: (prev, { subscriptionData }) => {
            if (!subscriptionData.data) return prev;
            const newUser = subscriptionData.data.userCreated;
            return Object.assign({}, prev, {
              users: [...prev.users, newUser]
            })
          }
        })
      }
    />
  );
}

class Messages extends React.Component {
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

function MessageLoader() {
  const { loading, error, data, subscribeToMore } = useQuery(GET_MESSAGES);

  if (loading) return 'Loading...';
  if (error) return `Error! ${error.message}`;

  return (
    <Messages
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
  const [createUser] = useMutation(CREATE_USER);
  const [createMessage] = useMutation(CREATE_MESSAGE);
  const [state, stateSet] = React.useState({
    hasJoined: false,
    nameInput: "",
    user: {
      id: 0,
      name: "Guest",
    },
    text: '',
  });

  // Function for handling sending of new messages.
  const onSendMessage = () => {
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

  // Function for handling creating user model.
  const onJoin = () => {
    // Only enable join function for those who haven't joined yet.
    if (!state.hasJoined) {
      if (state.nameInput.length > 0) {
        try {
          createUser({
            variables: { name: state.nameInput },
          }).then(result => {
            // Update state with assigned user ID and name.
            stateSet({
              ...state,
              user: {
                id: result.data.createUser.id,
                name: result.data.createUser.name,
              },
              hasJoined: true,
            });

            // Hide the "join" UI element.
          });
        } catch (e) {
          console.log(e);
        }
      }
    }
  }

  return (
    <div>
      <h1>Messages</h1>
      <MessageLoader />

      {state.hasJoined ? (
        <div id="form-message">
          <input
            type="text"
            name="text"
            id="text"
            value={state.text}
            placeholder="Enter a message..."
            onChange={(e) => stateSet({
                ...state,
                text: e.target.value,
              })
            }
            onKeyDown={(e) => {
              if (e.keyCode === 13) {
                onSendMessage();
              }
            }} />

          <button
            onClick={() => onSendMessage()}>
            Send
          </button>
        </div>
      ) : (
        <div id="form-join">
          <input
            type="text"
            name="username"
            id="username"
            value={state.nameInput}
            placeholder="Choose a name..."
            onChange={(e) => stateSet({
              ...state,
              nameInput: e.target.value,
            })}
            onKeyDown={(e) => {
              if (e.keyCode === 13) {
                onJoin();
              }
            }} />

          <button
            onClick={() => onJoin()}>
            Join
          </button>
        </div>
      )}
    </div>
  )
};

export default () => (
  <ApolloProvider client={client}>
    <Room />
  </ApolloProvider>
);