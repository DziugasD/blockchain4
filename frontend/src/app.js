import { MetaMaskSDK } from "@metamask/sdk";
import Web3 from 'web3';

let web3;
let contract;
let userAccount;

const MMSDK = new MetaMaskSDK({
    dappMetadata: {
        name: "Example JavaScript Dapp",
        url: window.location.href,
    },
    infuraAPIKey: process.env.REACT_APP_INFURA_API_KEY,
});

const contractAddress = '0x2557aC91F78fA64dBD1a462E9FE10d8dAC4573dA';
const contractABI = [
    {
      "inputs": [],
      "name": "orderCount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "orders",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        },
        {
          "internalType": "address payable",
          "name": "buyer",
          "type": "address"
        },
        {
          "internalType": "address payable",
          "name": "seller",
          "type": "address"
        },
        {
          "internalType": "address payable",
          "name": "courier",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "internalType": "enum SmartContract.State",
          "name": "state",
          "type": "uint8"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address payable",
          "name": "_seller",
          "type": "address"
        },
        {
          "internalType": "address payable",
          "name": "_courier",
          "type": "address"
        }
      ],
      "name": "createOrder",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_orderId",
          "type": "uint256"
        }
      ],
      "name": "confirmOrder",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_orderId",
          "type": "uint256"
        }
      ],
      "name": "shipOrder",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_orderId",
          "type": "uint256"
        }
      ],
      "name": "confirmDelivery",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ];

const SEPOLIA_CHAIN_ID = '0xaa36a7'; // Chain ID for Sepolia

function updateStatusMessage(message, isError = false) {
    const statusElement = document.getElementById('connectionStatus');
    statusElement.innerHTML = `<p class="${isError ? 'error' : 'success'}">${message}</p>`;
}

async function connectWallet() {
    try {
        const accounts = await MMSDK.connect();
        userAccount = accounts[0];
        
        const ethereum = MMSDK.getProvider();
        if (!ethereum) {
            updateStatusMessage('Please install MetaMask!', true);
            return false;
        }

        // Check and switch to Sepolia
        const chainId = await ethereum.request({ method: 'eth_chainId' });
        if (chainId !== SEPOLIA_CHAIN_ID) {
            try {
                await ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: SEPOLIA_CHAIN_ID }],
                });
            } catch (error) {
                updateStatusMessage('Please switch to Sepolia network', true);
                return false;
            }
        }

        web3 = new Web3(ethereum);
        contract = new web3.eth.Contract(contractABI, contractAddress);

        updateStatusMessage(`Connected to Sepolia: ${userAccount.substring(0, 6)}...${userAccount.substring(38)}`);
        return true;

    } catch (error) {
        updateStatusMessage(`Connection Error: ${error.message}`, true);
        return false;
    }
}

// Initialize SDK when page loads
window.addEventListener('load', async () => {
    await connectWallet();
});

// Update event listeners
const ethereum = MMSDK.getProvider();
if (ethereum) {
    ethereum.on('accountsChanged', (accounts) => {
        userAccount = accounts[0];
        console.log('Account changed:', userAccount);
        connectWallet();
    });

    ethereum.on('chainChanged', () => {
        window.location.reload();
    });
}

// Order Creation
document.getElementById('activateContract').addEventListener('click', async function() {
    if (!userAccount && !(await connectWallet())) return;
    
    const sellerAddress = document.getElementById('sellerAddress').value;
    const courierAddress = document.getElementById('courierAddress').value;
    const amount = document.getElementById('amount').value;

    try {
        const transaction = await contract.methods.createOrder(
            sellerAddress,
            courierAddress
        ).send({
            from: userAccount,
            value: web3.utils.toWei(amount, 'ether')
        });
        updateStatusMessage(`Order created successfully! Transaction: ${transaction.transactionHash}`);
    } catch (error) {
        updateStatusMessage(`Error creating order: ${error.message}`, true);
    }
});

// Order Management
document.getElementById('confirmOrder').addEventListener('click', async () => {
    handleOrderAction('confirmOrder', 'Order confirmed');
});

document.getElementById('shipOrder').addEventListener('click', async () => {
    handleOrderAction('shipOrder', 'Order shipped');
});

document.getElementById('confirmDelivery').addEventListener('click', async () => {
    handleOrderAction('confirmDelivery', 'Delivery confirmed');
});

async function handleOrderAction(method, successMessage) {
    if (!userAccount && !(await connectWallet())) return;
    
    const orderId = document.getElementById('orderId').value;
    try {
        const transaction = await contract.methods[method](orderId).send({
            from: userAccount
        });
        updateStatusMessage(`${successMessage}! Transaction: ${transaction.transactionHash}`);
    } catch (error) {
        updateStatusMessage(`Error: ${error.message}`, true);
    }
}

// Order Query
document.getElementById('getData').addEventListener('click', async function() {
    if (!userAccount && !(await connectWallet())) return;
    
    const orderId = document.getElementById('orderIdQuery').value;
    try {
        const order = await contract.methods.orders(orderId).call();
        const stateNames = ['Ordered', 'Confirmed', 'Shipped', 'Delivered'];
        const displayText = `
            Order ID: ${order.id}
            Buyer: ${order.buyer}
            Seller: ${order.seller}
            Courier: ${order.courier}
            Amount: ${web3.utils.fromWei(order.amount, 'ether')} ETH
            State: ${stateNames[order.state]}
        `;
        document.getElementById('displayData').innerText = displayText;
    } catch (error) {
        document.getElementById('displayData').innerText = `Error: ${error.message}`;
    }
});