// SPDX-License-Identifier: UNLICENSED 
pragma solidity ^0.8.0;

contract SmartContract {
    
    enum State { Ordered, Confirmed, Shipped, Delivered }
    
    struct Order {
        uint256 id;
        address payable buyer;
        address payable seller;
        address payable courier;
        uint256 amount;
        State state;
    }
    
    mapping(uint256 => Order) public orders;
    uint256 public orderCount;
    
    // Buyer creates an order and deposits payment
    function createOrder(address payable _seller, address payable _courier) public payable {
        require(msg.value > 0, "Payment required");
        orders[orderCount] = Order(
            orderCount,
            payable(msg.sender),
            _seller,
            _courier,
            msg.value,
            State.Ordered
        );
        orderCount++;
    }
    
    // Seller confirms the order
    function confirmOrder(uint256 _orderId) public {
        Order storage order = orders[_orderId];
        require(tx.origin == order.seller, "Only seller can confirm");
        require(order.state == State.Ordered, "Invalid state");
        order.state = State.Confirmed;
    }
    
    // Courier updates the status to shipped
    function shipOrder(uint256 _orderId) public {
        Order storage order = orders[_orderId];
        require(tx.origin == order.courier, "Only courier can ship");
        require(order.state == State.Confirmed, "Invalid state");
        order.state = State.Shipped;
    }
    
    // Buyer confirms delivery, triggering payments
    function confirmDelivery(uint256 _orderId) public {
        Order storage order = orders[_orderId];
        require(tx.origin == order.buyer, "Only buyer can confirm delivery");
        require(order.state == State.Shipped, "Invalid state");
        order.state = State.Delivered;
        uint256 sellerAmount = (order.amount * 90) / 100;
        uint256 courierAmount = order.amount - sellerAmount;
        order.seller.transfer(sellerAmount);
        order.courier.transfer(courierAmount);
    }
}
