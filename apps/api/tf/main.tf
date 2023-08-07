variable "ami_id" {
  description = "The AMI ID to use"
}

variable "subnet_id" {
  description = "The subnet ID to use"
}

variable "vpc_id" {
  description = "The VPC ID to use"
}
provider "aws" {
  region = "us-east-2" # Change to your desired region
}

resource "aws_instance" "express_server" {
  ami           = var.ami_id
  instance_type = "t2.micro"
  security_groups = [aws_security_group.allow_express.name]

  tags = {
    Name = "ExpressServer"
  }

  user_data = <<-EOF
                #!/bin/bash
                curl -sL https://rpm.nodesource.com/setup_14.x | bash -
                yum install -y nodejs
                npm install -g pm2
                cd /src
                npm install
                pm2 start index.js
                EOF
}

resource "aws_security_group" "allow_express" {
  name        = "allow_express"
  description = "Allow inbound traffic on port 3000"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] // or your specific IP
  }

  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] // or your specific IP
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

}

output "instance_public_ip" {
  value = aws_instance.express_server.public_ip
}

output "instance_public_dns" {
  value = aws_instance.express_server.public_dns
}
