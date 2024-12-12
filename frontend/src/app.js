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

const contractAddress = '0x0672a1aa5764847fa78b4A99D0e31aFFB12b8c2c';
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
    "type": "function",
    "constant": true
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
        "name": "Vairuotojas",
        "type": "address"
      },
      {
        "internalType": "address payable",
        "name": "Regitra",
        "type": "address"
      },
      {
        "internalType": "address payable",
        "name": "Egzaminuotojas",
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
      },
      {
        "internalType": "bool",
        "name": "passed",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [
      {
        "internalType": "address payable",
        "name": "_Regitra",
        "type": "address"
      },
      {
        "internalType": "address payable",
        "name": "_Egzaminuotojas",
        "type": "address"
      }
    ],
    "name": "createOrder",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function",
    "payable": true
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_orderId",
        "type": "uint256"
      }
    ],
    "name": "confirmRegistration",
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
      },
      {
        "internalType": "bool",
        "name": "_passed",
        "type": "bool"
      }
    ],
    "name": "conductExam",
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
    "name": "confirmResult",
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

// Define contractsContainer at the global scope
const contractsContainer = document.getElementById('userContracts');

// Initialize SDK when page loads
window.addEventListener('load', async () => {
    await connectWallet();
    await fetchUserContracts();

    // Add event listener for dynamically added buttons
    contractsContainer.addEventListener('click', async (event) => {
        if (event.target.classList.contains('action-btn')) {
            const method = event.target.getAttribute('data-method');
            const orderId = event.target.getAttribute('data-orderid');
            let successMessage = '';

            switch(method) {
                case 'confirmRegistration':
                    successMessage = 'Registration confirmed';
                    await handleOrderAction(method, successMessage, orderId);
                    break;
                case 'conductExam':
                    const passed = confirm('Did the exam pass? Click OK for Yes, Cancel for No.');
                    successMessage = 'Exam conducted';
                    await handleOrderActionWithParam(method, successMessage, orderId, passed);
                    break;
                case 'confirmResult':
                    successMessage = 'Result confirmed';
                    await handleOrderAction(method, successMessage, orderId);
                    break;
                default:
                    break;
            }

            // Refresh contracts after action
            await fetchUserContracts();
        }
    });
});

// Update event listeners
const ethereum = MMSDK.getProvider();
if (ethereum) {
    ethereum.on('accountsChanged', (accounts) => {
        userAccount = accounts[0];
        console.log('Account changed:', userAccount);
        connectWallet();
        fetchUserContracts();
    });

    ethereum.on('chainChanged', () => {
        window.location.reload();
    });
}

// Update the state names (ensure they match the contract)
const stateNames = ['Created', 'Registered', 'ExamConducted', 'ResultConfirmed'];

// Order Creation
document.getElementById('activateContract').addEventListener('click', async function() {
    if (!userAccount && !(await connectWallet())) return;
    
    const regitraAddress = document.getElementById('regitraAddress').value;
    const egzaminuotojasAddress = document.getElementById('egzaminuotojasAddress').value;
    const amount = document.getElementById('amount').value;

    try {
        const transaction = await contract.methods.createOrder(
            regitraAddress,
            egzaminuotojasAddress
        ).send({
            from: userAccount,
            value: web3.utils.toWei(amount, 'ether')
        });
        updateStatusMessage(`Order created successfully! Transaction: ${transaction.transactionHash}`);
    } catch (error) {
        updateStatusMessage(`Error creating order: ${error.message}`, true);
    }
});

// // Order Management
// document.getElementById('confirmOrder').removeEventListener('click', async () => {
//     handleOrderAction('confirmRegistration', 'Registration confirmed');
// });

// document.getElementById('shipOrder').removeEventListener('click', async () => {
//     const passed = document.getElementById('examResult').checked;
//     handleOrderActionWithParam('conductExam', 'Exam conducted', passed);
// });

// document.getElementById('confirmDelivery').removeEventListener('click', async () => {
//     handleOrderAction('confirmResult', 'Result confirmed');
// });

// // Modify handleOrderAction to match new methods
// async function handleOrderAction(method, successMessage) {
//     if (!userAccount && !(await connectWallet())) return;
    
//     const orderId = document.getElementById('orderId').value;
//     try {
//         const transaction = await contract.methods[method](orderId).send({
//             from: userAccount
//         });
//         updateStatusMessage(`${successMessage}! Transaction: ${transaction.transactionHash}`);
//     } catch (error) {
//         updateStatusMessage(`Error: ${error.message}`, true);
//     }
// }

// // New function to handle methods with additional parameters
// async function handleOrderActionWithParam(method, successMessage, param) {
//     if (!userAccount && !(await connectWallet())) return;
    
//     const orderId = document.getElementById('orderId').value;
//     try {
//         const transaction = await contract.methods[method](orderId, param).send({
//             from: userAccount
//         });
//         updateStatusMessage(`${successMessage}! Transaction: ${transaction.transactionHash}`);
//     } catch (error) {
//         updateStatusMessage(`Error: ${error.message}`, true);
//     }
// }

// Order Query
document.getElementById('getData').addEventListener('click', async function() {
    if (!userAccount && !(await connectWallet())) return;
    
    const orderId = document.getElementById('orderIdQuery').value;
    try {
        const order = await contract.methods.orders(orderId).call();
        const displayText = `
            Order ID: ${order.id}
            Vairuotojas: ${order.Vairuotojas}
            Regitra: ${order.Regitra}
            Egzaminuotojas: ${order.Egzaminuotojas}
            Amount: ${web3.utils.fromWei(order.amount, 'ether')} ETH
            State: ${stateNames[order.state]}
            Passed: ${order.passed}
        `;
        document.getElementById('displayData').innerText = displayText;
    } catch (error) {
        document.getElementById('displayData').innerText = `Error: ${error.message}`;
    }
});

// Fetch contracts/orders for the current wallet address
async function fetchUserContracts() {
    if (!userAccount && !(await connectWallet())) return;
    
    try {
        const orderCount = await contract.methods.orderCount().call();
        const userContracts = [];
        
        for (let i = 0; i < orderCount; i++) {
            const order = await contract.methods.orders(i).call();
            if (order.Vairuotojas.toLowerCase() === userAccount.toLowerCase() ||
                order.Regitra.toLowerCase() === userAccount.toLowerCase() ||
                order.Egzaminuotojas.toLowerCase() === userAccount.toLowerCase()) {
                userContracts.push(order);
            }
        }
        console.log(userAccount, userContracts);
        displayUserContracts(userContracts);
    } catch (error) {
        console.error('Error fetching user contracts:', error);
    }
}

// Display user contracts/orders
function displayUserContracts(contracts) {
    contractsContainer.innerHTML = '';
    
    contracts.forEach(order => {
        const contractElement = document.createElement('div');
        contractElement.className = 'contract-item';
        contractElement.innerHTML = `
            <p>Order ID: ${order.id}</p>
            <p>Vairuotojas: ${truncateAddress(order.Vairuotojas)}</p>
            <p>Regitra: ${truncateAddress(order.Regitra)}</p>
            <p>Egzaminuotojas: ${truncateAddress(order.Egzaminuotojas)}</p>
            <p>Amount: ${web3.utils.fromWei(order.amount, 'ether')} ETH</p>
            <p>State: ${stateNames[order.state]}</p>
            <p>Passed: ${order.passed}</p>
            ${getActionButton(order)}
        `;
        contractsContainer.appendChild(contractElement);
    });
}

// Helper function to truncate addresses for display
function truncateAddress(address) {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

// Function to determine which action button to display based on user role and order state
function getActionButton(order) {
    const lowerCaseUser = userAccount.toLowerCase();
    const currentState = order.state;

    // Vairuotojas (Driver)
    if (order.Vairuotojas.toLowerCase() === lowerCaseUser) {
        if (currentState == '0') { // Created
            return `<button class="action-btn" data-method="confirmRegistration" data-orderid="${order.id}">Confirm Registration</button>`;
        }
    }
    // Egzaminuotojas (Examiner)
    if (order.Egzaminuotojas.toLowerCase() === lowerCaseUser) {
        if (currentState == '1') { // Registered
            return `<button class="action-btn" data-method="conductExam" data-orderid="${order.id}">Conduct Exam</button>`;
        }
    }
    // Regitra (Registration Office)
    if (order.Regitra.toLowerCase() === lowerCaseUser) {
        if (currentState == '2') { // ExamConducted
            return `<button class="action-btn" data-method="confirmResult" data-orderid="${order.id}">Confirm Result</button>`;
        }
    }
    return '';
}

// Modify handleOrderAction to refresh contracts after action
async function handleOrderAction(method, successMessage, orderId) {
    if (!userAccount && !(await connectWallet())) return;

    try {
        const transaction = await contract.methods[method](orderId).send({
            from: userAccount
        });
        updateStatusMessage(`${successMessage}! Transaction: ${transaction.transactionHash}`);

        // Refresh contracts after action
        await fetchUserContracts();

    } catch (error) {
        updateStatusMessage(`Error: ${error.message}`, true);
    }
}

async function handleOrderActionWithParam(method, successMessage, orderId, param) {
    if (!userAccount && !(await connectWallet())) return;
    
    try {
        const transaction = await contract.methods[method](orderId, param).send({
            from: userAccount
        });
        updateStatusMessage(`${successMessage}! Transaction: ${transaction.transactionHash}`);

        // Refresh contracts after action
        await fetchUserContracts();

    } catch (error) {
        updateStatusMessage(`Error: ${error.message}`, true);
    }
}