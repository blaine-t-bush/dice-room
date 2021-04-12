import React, { useEffect } from 'react';
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
import { getMainDefinition } from '@apollo/client/utilities';
import { WebSocketLink } from '@apollo/client/link/ws';

import './Room.css';

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
const VERIFY_USER = gql`
  mutation verifyUser($id: ID!, $name: String!) {
    verifyUser(id: $id, name: $name)
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

const GET_MESSAGES = gql`
  query getMessages {
    messages {
      id
      user {
        id
        name
      }
      text
      roll {
        id
        createdAt
        diceCount
        diceFaces
        result
      }
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

const CREATE_ROLL = gql`
  mutation createRoll($userId: ID!, $diceCount: Int!, $diceFaces: Int!) {
    createRoll(userId: $userId, diceCount: $diceCount, diceFaces: $diceFaces) {
      id
      createdAt
      user {
        id
        createdAt
        name
      }
      diceCount
      diceFaces
      result
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

class Messages extends React.Component {
  scrollToBottom = () => {
    this.messagesEnd.scrollIntoView({ behavior: "smooth" });
  }

  scrollToBottomFast = () => {
    this.messagesEnd.scrollIntoView({ behavior: "auto" });
  }

  componentDidMount() {
    this.props.subscribeToNewMessages();
    this.scrollToBottomFast();
  }

  componentDidUpdate() {
    this.scrollToBottom();
  }

  render() {
    return (
      <ul id="messages" className="messages">
        {this.props.messages.map(({id, user, text, roll}) => { return (
          <li key={id} className={`message ${parseInt(this.props.userId) === parseInt(user.id) ? "self" : ""}`}>
            <div className="message-name">
              {parseInt(this.props.userId) !== parseInt(user.id) ? (
                <>{user.name}</>) : (
                <></>
              )}
            </div>

            <div className="message-text">
              {roll ? (
                <span>
                  <em>{roll.diceCount}d{roll.diceFaces}</em> &#8594; <strong>{roll.result}</strong>
                </span>
              ) : (
                <span>
                  {text}
                </span>
              )}
            </div>
          </li>
        )})}
        <div style={{ float:"left", clear: "both" }}
             ref={(el) => { this.messagesEnd = el; }}>
        </div>
      </ul>
    );
  }
}

function MessageLoader(props) {
  const { loading, error, data, subscribeToMore } = useQuery(GET_MESSAGES);

  if (loading) return 'Loading...';
  if (error) return `Error! ${error.message}`;

  return (
    <Messages
      messages={data.messages}
      userId={props.userId}
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
  const [verifyUser] = useMutation(VERIFY_USER);
  const [createUser] = useMutation(CREATE_USER);
  const [createMessage] = useMutation(CREATE_MESSAGE);
  const [createRoll] = useMutation(CREATE_ROLL);
  const [state, stateSet] = React.useState({
    hasJoined: false,
    nameInput: '',
    user: {
      id: 0,
      name: 'Guest',
    },
    text: '',
  });

  useEffect(() => {
    // Check local storage for user info.
    var hasJoined = localStorage.getItem('hasJoined') === 'true';
    var userId = localStorage.getItem('userId') ? parseInt(localStorage.getItem('userId')) : 0;
    var userName = localStorage.getItem('userName') ? localStorage.getItem('userName') : 'Guest';
    
    // Verify that user in local storage exists on server.
    verifyUser({
      variables: { id: userId, name: userName },
    }).then(result => {
      // If it does, continue as that user. If not, need to join.
      if (result.data.verifyUser) {
        stateSet({
          hasJoined: hasJoined,
          nameInput: '',
          user: {
            id: userId,
            name: userName,
          },
          text: '',
        });
      } else {
        stateSet({
          hasJoined: false,
          nameInput: '',
          user: {
            id: 0,
            name: 'Guest',
          },
          text: '',
        });
      }
    });
  }, [verifyUser, state.user.id]);

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

  // Function for opening and closing the dice tray.
  const [isDiceMenuOpen, setDiceMenuOpen] = React.useState(false);
  const onClickDiceMenu = () => {
    setDiceMenuOpen(!isDiceMenuOpen)
  }

  // Function for handling rolling of dice.
  const onRoll = (diceCount, diceFaces) => {
    try {
      createRoll({
        variables: { userId: state.user.id, diceCount: diceCount, diceFaces: diceFaces },
      });
    } catch (e) {
      console.log(e);
    }
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

            localStorage.setItem('hasJoined', true);
            localStorage.setItem('userId', result.data.createUser.id);
            localStorage.setItem('userName', result.data.createUser.name);
          });
        } catch (e) {
          console.log(e);
        }
      }
    }
  }

  return (
    <div id="outer-container" className="container">
      <h1>Dice Bazaar</h1>
      <MessageLoader userId={state.user.id} />

      {state.hasJoined ? (
        <div className="form-container has-dice">
          <div id="dice-modal" className={isDiceMenuOpen ? "active" : null}>
            <div id="dice-menu-icon" onClick={() => onClickDiceMenu()}>
              🎲
            </div>
            <div id="dice-container" className="dice-container">
              <button onClick={() => onRoll(1, 100)}>d100</button>
              <button onClick={() => onRoll(1, 20)}>d20</button>
              <button onClick={() => onRoll(1, 12)}>d12</button>
              <button onClick={() => onRoll(1, 10)}>d10</button>
              <button onClick={() => onRoll(1, 8)}>d8</button>
              <button onClick={() => onRoll(1, 6)}>d6</button>
              <button onClick={() => onRoll(1, 4)}>d4</button>
            </div>
            <div id="dice-container-triangle" ></div>
          </div>

          <input
            type="text"
            name="text"
            id="text"
            autoFocus
            autoComplete="off"
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
            }}
          />

          <button onClick={() => onSendMessage()}>Send</button>
        </div>
      ) : (
        <div className="form-container"> 
          <input
            type="text"
            name="username"
            id="username"
            autoFocus
            autoComplete="off"
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
            }}
          />

          <button onClick={() => onJoin()}>Join</button>
        </div>
      )}
    </div>
  )
};

const RoomWithProvider = () => (
  <ApolloProvider client={client}>
    <Room />
  </ApolloProvider>
);

export default RoomWithProvider;