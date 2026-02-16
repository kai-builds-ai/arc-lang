# ============================================================================
# Neural Network in Arc
# ============================================================================
# A simple feedforward neural network with matrix operations, activation
# functions, forward/backward propagation, and gradient descent training.
# Trains on the XOR problem as a demonstration.
# Demonstrates: math, closures, pipelines, pattern matching, mut, collections,
# higher-order functions, string interpolation.
# ============================================================================

use math
use collections

# --- Matrix Operations ---

pub fn matrix(rows, cols, init_fn) => {
    collections.range(0, rows) |> collections.map(fn(r) => {
        collections.range(0, cols) |> collections.map(fn(c) => init_fn(r, c))
    })
}

pub fn zeros(rows, cols) => matrix(rows, cols, fn(_, _) => 0.0)
pub fn ones(rows, cols) => matrix(rows, cols, fn(_, _) => 1.0)

pub fn random_matrix(rows, cols, scale) => {
    matrix(rows, cols, fn(_, _) => (math.random() * 2.0 - 1.0) * scale)
}

pub fn mat_shape(m) => [collections.length(m), collections.length(m[0])]

pub fn mat_add(a, b) => {
    a |> collections.map_indexed(fn(row, i) => {
        row |> collections.map_indexed(fn(val, j) => val + b[i][j])
    })
}

pub fn mat_sub(a, b) => {
    a |> collections.map_indexed(fn(row, i) => {
        row |> collections.map_indexed(fn(val, j) => val - b[i][j])
    })
}

pub fn mat_mul(a, b) => {
    let a_rows = collections.length(a)
    let b_cols = collections.length(b[0])
    let inner = collections.length(b)
    
    matrix(a_rows, b_cols, fn(i, j) => {
        collections.range(0, inner)
        |> collections.reduce(0.0, fn(sum, k) => sum + a[i][k] * b[k][j])
    })
}

pub fn mat_transpose(m) => {
    let rows = collections.length(m)
    let cols = collections.length(m[0])
    matrix(cols, rows, fn(i, j) => m[j][i])
}

pub fn mat_scale(m, scalar) => {
    m |> collections.map(fn(row) => row |> collections.map(fn(v) => v * scalar))
}

pub fn mat_elementwise(a, b, op) => {
    a |> collections.map_indexed(fn(row, i) => {
        row |> collections.map_indexed(fn(val, j) => op(val, b[i][j]))
    })
}

pub fn mat_map(m, f) => {
    m |> collections.map(fn(row) => row |> collections.map(f))
}

pub fn mat_sum(m) => {
    m |> collections.flat_map(fn(row) => row) |> collections.reduce(0.0, fn(a, b) => a + b)
}

pub fn mat_mean(m) => {
    let shape = mat_shape(m)
    mat_sum(m) / (shape[0] * shape[1])
}

# Broadcast a column vector to match matrix dimensions
pub fn broadcast_add(m, bias) => {
    m |> collections.map_indexed(fn(row, i) => {
        row |> collections.map_indexed(fn(val, j) => val + bias[0][j])
    })
}

# --- Activation Functions ---

pub fn sigmoid(x) => 1.0 / (1.0 + math.exp(-x))
pub fn sigmoid_derivative(x) => x * (1.0 - x)

pub fn relu(x) => match x > 0 { true => x, false => 0.0 }
pub fn relu_derivative(x) => match x > 0 { true => 1.0, false => 0.0 }

pub fn tanh_act(x) => math.tanh(x)
pub fn tanh_derivative(x) => 1.0 - x * x

pub fn leaky_relu(x) => match x > 0 { true => x, false => 0.01 * x }
pub fn leaky_relu_derivative(x) => match x > 0 { true => 1.0, false => 0.01 }

fn get_activation(name) => {
    match name {
        "sigmoid" => { forward: sigmoid, backward: sigmoid_derivative },
        "relu" => { forward: relu, backward: relu_derivative },
        "tanh" => { forward: tanh_act, backward: tanh_derivative },
        "leaky_relu" => { forward: leaky_relu, backward: leaky_relu_derivative },
        _ => { forward: sigmoid, backward: sigmoid_derivative }
    }
}

# --- Loss Functions ---

pub fn mse_loss(predicted, target) => {
    let diff = mat_sub(predicted, target)
    let squared = mat_elementwise(diff, diff, fn(a, b) => a * b)
    mat_mean(squared)
}

pub fn mse_loss_derivative(predicted, target) => {
    let shape = mat_shape(predicted)
    let n = shape[0] * shape[1]
    mat_sub(predicted, target) |> mat_scale(2.0 / n)
}

# --- Layer Definition ---

pub fn dense_layer(input_size, output_size, activation) => {
    let scale = math.sqrt(2.0 / input_size) # He initialization
    {
        weights: random_matrix(input_size, output_size, scale),
        bias: zeros(1, output_size),
        activation: get_activation(activation),
        activation_name: activation,
        # Cache for backprop
        input: nil,
        z: nil,
        output: nil
    }
}

# --- Neural Network ---

pub fn create_network(layers) => {
    {
        layers: layers,
        learning_rate: 0.1,
        epoch: 0
    }
}

pub fn set_learning_rate(network, lr) => {
    let mut n = network
    n.learning_rate = lr
    n
}

# --- Forward Propagation ---

pub fn forward(network, input) => {
    let mut current = input
    let mut layers = network.layers
    
    layers = layers |> collections.map(fn(layer) => {
        let mut l = layer
        l.input = current
        
        # z = input * weights + bias
        l.z = mat_mul(current, l.weights) |> broadcast_add(l.bias)
        
        # output = activation(z)
        l.output = mat_map(l.z, l.activation.forward)
        
        current = l.output
        l
    })
    
    let mut n = network
    n.layers = layers
    { network: n, output: current }
}

# --- Backward Propagation ---

pub fn backward(network, target) => {
    let mut layers = network.layers
    let num_layers = collections.length(layers)
    
    # Start with output layer error
    let output_layer = layers[num_layers - 1]
    let mut delta = mat_elementwise(
        mse_loss_derivative(output_layer.output, target),
        mat_map(output_layer.output, output_layer.activation.backward),
        fn(a, b) => a * b
    )
    
    # Backpropagate through layers in reverse
    let mut layer_deltas = []
    let mut current_delta = delta
    
    collections.range(0, num_layers) |> collections.reverse() |> collections.each(fn(i) => {
        let layer = layers[i]
        
        match i == num_layers - 1 {
            true => {
                layer_deltas = [{ index: i, delta: current_delta }] |> collections.concat(layer_deltas)
            },
            false => {
                let next_layer = layers[i + 1]
                current_delta = mat_elementwise(
                    mat_mul(current_delta, mat_transpose(next_layer.weights)),
                    mat_map(layer.output, layer.activation.backward),
                    fn(a, b) => a * b
                )
                layer_deltas = [{ index: i, delta: current_delta }] |> collections.concat(layer_deltas)
            }
        }
    })
    
    # Update weights and biases
    let lr = network.learning_rate
    layers = layers |> collections.map_indexed(fn(layer, i) => {
        let mut l = layer
        let ld = layer_deltas |> collections.find(fn(d) => d.index == i)
        let d = ld.delta
        
        # weight_gradient = input^T * delta
        let weight_grad = mat_mul(mat_transpose(l.input), d)
        l.weights = mat_sub(l.weights, mat_scale(weight_grad, lr))
        
        # bias_gradient = sum of deltas across batch
        let bias_grad = collections.range(0, collections.length(d[0]))
            |> collections.map(fn(j) => {
                d |> collections.reduce(0.0, fn(sum, row) => sum + row[j])
            })
        l.bias = [[]] |> fn(_) => [bias_grad |> collections.map_indexed(fn(g, j) => l.bias[0][j] - lr * g)]
        
        l
    })
    
    let mut n = network
    n.layers = layers
    n
}

# --- Training ---

pub fn train(network, inputs, targets, epochs, log_every) => {
    let mut net = network
    let mut loss_history = []
    
    collections.range(0, epochs) |> collections.each(fn(epoch) => {
        # Forward pass
        let fwd = forward(net, inputs)
        net = fwd.network
        
        # Calculate loss
        let loss = mse_loss(fwd.output, targets)
        
        # Backward pass
        net = backward(net, targets)
        net.epoch = epoch + 1
        
        loss_history = loss_history |> collections.append({ epoch: epoch, loss: loss })
        
        match epoch % log_every == 0 {
            true => print("Epoch ${epoch}: loss = ${loss}"),
            false => {}
        }
    })
    
    { network: net, loss_history: loss_history }
}

# --- Prediction ---

pub fn predict(network, input) => {
    let result = forward(network, input)
    result.output
}

# --- Network Summary ---

pub fn summary(network) => {
    print("\n=== Network Summary ===")
    let mut total_params = 0
    
    network.layers |> collections.each_indexed(fn(layer, i) => {
        let w_shape = mat_shape(layer.weights)
        let params = w_shape[0] * w_shape[1] + collections.length(layer.bias[0])
        total_params = total_params + params
        print("Layer ${i}: Dense(${w_shape[0]} -> ${w_shape[1]}) [${layer.activation_name}] - ${params} params")
    })
    
    print("Total parameters: ${total_params}")
    print("")
}

# --- Main Demo: XOR Problem ---

fn main() => {
    print("=== Arc Neural Network Demo ===")
    print("Training on XOR problem\n")
    
    # XOR inputs and targets
    let inputs = [
        [0.0, 0.0],
        [0.0, 1.0],
        [1.0, 0.0],
        [1.0, 1.0]
    ]
    
    let targets = [
        [0.0],
        [1.0],
        [1.0],
        [0.0]
    ]
    
    # Create network: 2 -> 8 -> 4 -> 1
    let mut net = create_network([
        dense_layer(2, 8, "sigmoid"),
        dense_layer(8, 4, "sigmoid"),
        dense_layer(4, 1, "sigmoid")
    ]) |> set_learning_rate(0.5)
    
    summary(net)
    
    # Train
    print("Training for 10000 epochs...\n")
    let result = train(net, inputs, targets, 10000, 1000)
    net = result.network
    
    # Final predictions
    print("\n--- Predictions ---")
    inputs |> collections.each_indexed(fn(input, i) => {
        let output = predict(net, [input])
        let predicted = output[0][0]
        let expected = targets[i][0]
        let correct = match math.abs(predicted - expected) < 0.1 { true => "✓", false => "✗" }
        print("Input: ${input} => ${predicted} (expected: ${expected}) ${correct}")
    })
    
    # Loss curve summary
    print("\n--- Loss Curve ---")
    let key_points = result.loss_history
        |> collections.filter(fn(h) => h.epoch % 2000 == 0 or h.epoch == 9999)
    key_points |> collections.each(fn(h) => {
        let bar_len = math.max(1, math.min(50, (h.loss * 50) |> math.floor()))
        let bar = "█".repeat(bar_len)
        print("  Epoch ${h.epoch}: ${bar} ${h.loss}")
    })
    
    let final_loss = result.loss_history |> collections.last()
    print("\nFinal loss: ${final_loss.loss}")
    print("Training complete!")
}

main()
