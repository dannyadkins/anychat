module "eks" {
  source          = "terraform-aws-modules/eks/aws"
  cluster_name    = "my-cluster"
  cluster_version = "1.20"
  node_groups = {
    eks_nodes = {
      desired_capacity = 2
      max_capacity     = 3
      min_capacity     = 1
      key_name         = var.key_name
      instance_type    = "m5.large"
      key_pair_name    = var.key_pair_name
    }
  }
}

provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_ca_data)
  token                  = module.eks.cluster_oidc_token
}

resource "kubernetes_namespace" "app" {
  metadata {
    name = "app"
  }
}

resource "kubernetes_deployment" "app" {
  metadata {
    name      = "app"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  spec {
    replicas = 2

    selector {
      match_labels = {
        App = "app"
      }
    }

    template {
      metadata {
        labels = {
          App = "app"
        }
      }

      spec {
        container {
          image = "URL_OF_YOUR_DOCKER_IMAGE"
          name  = "app"
        }
      }
    }
  }
}

resource "kubernetes_service" "app" {
  metadata {
    name      = "app"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  spec {
    selector = {
      App = kubernetes_deployment.app.spec[0].template[0].metadata[0].labels.App
    }

    port {
      port        = 8000
      target_port = 8000
    }

    type = "LoadBalancer"
  }
}
