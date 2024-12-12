// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SmartContract {
    
    enum State { Ordered, Confirmed, Shipped, Delivered }
    
    struct Order {
        uint256 id;
        address payable Vairuotojas;
        address payable Regitra;
        address payable Egzaminuotojas;
        uint256 amount;
        State state;
        bool passed; // New variable to store exam result
    }
    
    mapping(uint256 => Order) public orders;
    uint256 public orderCount;
    
    // Vairuotojas creates an order and deposits payment
    function createOrder(address payable _Regitra, address payable _Egzaminuotojas) public payable {
        require(msg.value > 0, "Payment required");
        orders[orderCount] = Order(
            orderCount,
            payable(msg.sender),
            _Regitra,
            _Egzaminuotojas,
            msg.value,
            State.Ordered,
            false  // Initialize 'passed' to false
        );
        orderCount++;
    }
    
    // Regitra confirms the registration
    function confirmRegistration(uint256 _orderId) public {
        Order storage order = orders[_orderId];
        require(tx.origin == order.Regitra, "Only Regitra can confirm");
        require(order.state == State.Ordered, "Invalid state");
        order.state = State.Confirmed;
    }
    
    // Egzaminuotojas conducts the exam and records the result
    function conductExam(uint256 _orderId, bool _passed) public {
        Order storage order = orders[_orderId];
        require(tx.origin == order.Egzaminuotojas, "Only Egzaminuotojas can conduct exam");
        require(order.state == State.Confirmed, "Invalid state");
        order.state = State.Shipped;
        order.passed = _passed;
    }
    
    // Vairuotojas confirms the exam result
    function confirmResult(uint256 _orderId) public {
        Order storage order = orders[_orderId];
        require(tx.origin == order.Vairuotojas, "Only Vairuotojas can confirm result");
        require(order.state == State.Shipped, "Invalid state");
        order.state = State.Delivered;
        uint256 RegitraAmount = (order.amount * 90) / 100;
        uint256 EgzaminuotojasAmount = order.amount - RegitraAmount;
        order.Regitra.transfer(RegitraAmount);
        order.Egzaminuotojas.transfer(EgzaminuotojasAmount);
        if (order.passed) {
            // Grant license to Vairuotojas
            // Potentially set a mapping to record license issuance
            // licenses[order.Vairuotojas] = true;
        }
        // No refund to Vairuotojas upon failure
    }
}
